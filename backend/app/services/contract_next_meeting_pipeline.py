"""모든 일정추천 트리거(보고서 확정·일정 수동 등록·영업 딜 생성/이동·CS 처리 시작·거절/재생성)를
고객사 단위 추천 한 건으로 모아 "계약관리 다음 미팅 제안 → 일정관리 유효성 점검"을 이어서
실행하고 결과를 저장한다.

미팅은 고객사와 하고 그 고객사 안에 여러 딜이 있을 수 있으므로, 딜에서 출발한 트리거도
그 딜의 고객사로 올려 같은 입구(`_run_company_pipeline`)로 들어간다. 그래서 어떤 트리거든
계약관리 에이전트는 같은 고객사 입력을 받고, 카드는 `company:<id>` 범위에 한 건만 남는다.
라우터는 트리거 커밋 직후 `queue*()`만 호출하고 실제 체이닝은 `BackgroundTasks`로 미룬다 —
실패해도 트리거가 된 원래 요청은 되돌리지 않는다.

캘린더는 여기서 저장한 결과를 조회만 한다(`GET /contract-next-meeting-suggestions`).
화면에서 LLM을 기다리지 않는 대신, 사용자가 보기 전에 미리 계산해 두는 구조다.
"""

from datetime import UTC, date, datetime, time, timedelta
from uuid import UUID, uuid4

from fastapi import BackgroundTasks, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy import and_, or_, select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.agents import contract_management, schedule_management
from app.core.config import settings
from app.db.session import get_sessionmaker
from app.models.agent import AgentRun, ContractNextMeetingSuggestion
from app.models.crm import Activity
from app.models.sales import SalesDeal
from app.models.workspace import Member
from app.services import contract_schedule_snapshots

# 한 딜의 기존 pipeline이 도는 동안 들어온 최신 보고서는 이 시각까지 잠시 미룬다. 현재
# 두 LLM 호출의 timeout 합보다 길고, 정상 완료 시에는 _wake_latest()가 즉시 당겨 준다.
_FOLLOW_UP_DELAY = timedelta(minutes=2)


def queue(background: BackgroundTasks, sales_deal_id: UUID, source_refs: dict[str, str]) -> None:
    """딜 트리거(딜 생성·이동, CS 처리 시작 등)도 그 딜의 고객사 추천 한 건으로 모은다."""
    background.add_task(_run_deal_trigger, sales_deal_id, source_refs)


def queue_company(
    background: BackgroundTasks,
    customer_company_id: UUID,
    owner_member_id: UUID,
    source_refs: dict[str, str],
) -> None:
    """고객사가 이미 정해진 트리거(일정 수동 등록 등)를 고객사 추천으로 예약한다."""
    background.add_task(_run_company_pipeline, customer_company_id, owner_member_id, source_refs)


def queue_report(
    background: BackgroundTasks,
    customer_company_id: UUID,
    report_id: UUID,
    source_activity_id: UUID,
) -> None:
    """미팅 보고서의 신규·수정 제출을 고객사 일정추천 한 건으로 예약한다."""
    background.add_task(_run_report_trigger, customer_company_id, report_id, source_activity_id)


async def regenerate(
    customer_company_id: UUID,
    owner_member_id: UUID,
    *,
    customer_contact_id: UUID | None = None,
    report_id: UUID | None = None,
    activity_id: UUID | None = None,
    excluded_dates: list[date] | None = None,
    refresh_reason: str | None = None,
) -> bool:
    """거절·수동 재생성을 영속 작업으로 예약한다. LLM 완료를 HTTP 요청에서 기다리지 않는다.

    원래 보고서가 그 뒤 삭제됐을 수 있으므로 보고서를 필수 입력으로 요구하지 않는다.
    """
    refs = {"refresh": "explicit"}
    if report_id is not None:
        refs["report_id"] = str(report_id)
    if activity_id is not None:
        refs["activity_id"] = str(activity_id)
    return await _run_company_pipeline(
        customer_company_id,
        owner_member_id,
        refs,
        customer_contact_id=customer_contact_id,
        excluded_dates=excluded_dates,
        refresh_reason=refresh_reason,
    )


async def _run_deal_trigger(sales_deal_id: UUID, source_refs: dict[str, str]) -> bool:
    if not settings.llm_configured:
        return False
    async with get_sessionmaker()() as session:
        deal = await _open_deal(session, sales_deal_id)
    if deal is None:
        return False
    return await _run_company_pipeline(
        deal.customer_company_id,
        deal.owner_member_id,
        {**source_refs, "trigger_sales_deal_id": str(sales_deal_id)},
        customer_contact_id=deal.customer_contact_id,
    )


async def _run_report_trigger(
    customer_company_id: UUID, report_id: UUID, source_activity_id: UUID
) -> bool:
    if not settings.llm_configured:
        return False
    async with get_sessionmaker()() as session:
        activity = (
            await session.execute(
                select(Activity).where(
                    Activity.id == source_activity_id,
                    Activity.customer_company_id == customer_company_id,
                    Activity.deleted_at.is_(None),
                )
            )
        ).scalar_one_or_none()
    if activity is None:
        return False
    return await _run_company_pipeline(
        customer_company_id,
        activity.owner_member_id,
        {"report_id": str(report_id), "activity_id": str(source_activity_id)},
        customer_contact_id=activity.customer_contact_id,
        required_report_id=report_id,
    )


async def _run_company_pipeline(
    customer_company_id: UUID,
    owner_member_id: UUID,
    source_refs: dict[str, str],
    *,
    customer_contact_id: UUID | None = None,
    required_report_id: UUID | None = None,
    excluded_dates: list[date] | None = None,
    refresh_reason: str | None = None,
) -> bool:
    """모든 트리거가 모이는 단일 입구. 고객사당 최신 입력 하나로 계약관리 작업을 예약한다."""
    if not settings.llm_configured:
        return False
    scope_key = _company_scope(customer_company_id)
    async with get_sessionmaker()() as session:
        await _lock_scope(session, scope_key)
        owner = await _member(session, owner_member_id)
        if owner is None:
            return False
        try:
            next_meeting_input = await contract_schedule_snapshots.build_next_meeting_snapshot(
                session,
                owner,
                customer_company_id,
                required_report_id=required_report_id,
                excluded_dates=excluded_dates,
            )
        except HTTPException:
            return False

        now = datetime.now(UTC)
        active_run_id = await _active_scope_run_id(session, scope_key, now)
        # 아직 worker가 잡지 않은 이전 요청은 취소하고 가장 최신 입력 하나만 남긴다.
        await session.execute(
            update(AgentRun)
            .where(
                AgentRun.agent_code.in_(
                    ("contract_management_next_meeting", "schedule_management")
                ),
                AgentRun.status_code == "queued",
                AgentRun.source_refs["durable_pipeline"].astext == "true",
                AgentRun.source_refs["recommendation_scope"].astext == scope_key,
            )
            .values(
                status_code="cancelled",
                current_stage_code="cancelled",
                error_code="agent_run_superseded",
                error_message="agent_run_superseded",
                finished_at=now,
            )
        )
        run_id = uuid4()
        refs = {
            **source_refs,
            "durable_pipeline": True,
            "_worker_pool": settings.app_env,
            "recommendation_scope": scope_key,
            "customer_company_id": str(customer_company_id),
            "owner_member_id": str(owner.id),
            "customer_contact_id": str(customer_contact_id) if customer_contact_id else None,
            "excluded_dates": [value.isoformat() for value in (excluded_dates or [])],
            "refresh_reason": refresh_reason,
        }
        if active_run_id is not None:
            refs["waiting_for_run_id"] = str(active_run_id)
        session.add(
            AgentRun(
                id=run_id,
                team_id=owner.team_id,
                parent_run_id=None,
                requested_by_member_id=None,
                agent_code="contract_management_next_meeting",
                trigger_code="system",
                idempotency_key=None,
                status_code="queued",
                llm_model_name=settings.llm_model,
                prompt_version=contract_management.PROPOSE_NEXT_MEETING_PROMPT_VERSION,
                source_refs=refs,
                # 스냅샷에는 Python date/time/UUID가 포함될 수 있다. JSONB 저장 경계에서
                # 변환하지 않으면 거절 재추천 INSERT가 실패한다.
                input_snapshot=jsonable_encoder(next_meeting_input),
                output_snapshot=None,
                evidence=None,
                error_message=None,
                error_code=None,
                current_stage_code="queued",
                attempt_count=0,
                request_snapshot={},
                request_hash=None,
                scope_key=f"contract_next_meeting:{scope_key}:{run_id}",
                payload_expires_at=None,
                payload_redacted_at=None,
                lease_owner=None,
                lease_expires_at=None,
                heartbeat_at=None,
                next_attempt_at=(now + _FOLLOW_UP_DELAY if active_run_id else now),
                input_tokens=None,
                output_tokens=None,
                total_tokens=None,
                created_at=now,
                started_at=None,
                finished_at=None,
            )
        )
        await session.commit()
    return True


async def resume_completed(run_id: UUID) -> bool:
    """worker가 완료한 영속 추천 작업의 다음 단계를 멱등하게 이어 간다."""
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        run = await session.get(AgentRun, run_id)
        if run is None or run.status_code != "completed":
            return False
        if not (run.source_refs or {}).get("durable_pipeline"):
            return False
        customer_company_id = _source_uuid(run.source_refs, "customer_company_id")
        if customer_company_id is None:
            return False
        scope_key = _company_scope(customer_company_id)

        if run.agent_code == "contract_management_next_meeting":
            existing_child = (
                await session.execute(
                    select(AgentRun.id).where(
                        AgentRun.parent_run_id == run.id,
                        AgentRun.agent_code == "schedule_management",
                    )
                )
            ).scalar_one_or_none()
            if existing_child is not None:
                return False
            if not (run.output_snapshot or {}).get("next_meeting_suggestion"):
                await _wake_latest_for_run(session, run, excluding=run.id)
                await session.commit()
                return False
            owner_member_id = await _owner_member_id(session, run)
            owner = await _member(session, owner_member_id) if owner_member_id else None
            if owner is None:
                return False
            excluded_dates = _source_dates(run.source_refs, "excluded_dates")
            try:
                schedule_input = await contract_schedule_snapshots.build_schedule_snapshot(
                    session,
                    owner,
                    None,
                    run,
                    None,
                    None,
                    excluded_dates=excluded_dates,
                    customer_company_id=customer_company_id,
                )
            except HTTPException:
                return False
            now = datetime.now(UTC)
            child_id = uuid4()
            session.add(
                AgentRun(
                    id=child_id,
                    team_id=run.team_id,
                    parent_run_id=run.id,
                    requested_by_member_id=None,
                    agent_code="schedule_management",
                    trigger_code="system",
                    idempotency_key=None,
                    status_code="queued",
                    llm_model_name=settings.llm_model,
                    prompt_version=schedule_management.PROMPT_VERSION,
                    source_refs={
                        **{
                            key: value
                            for key, value in (run.source_refs or {}).items()
                            if key in {"customer_contact_id", "report_id", "activity_id"}
                        },
                        "durable_pipeline": True,
                        "_worker_pool": settings.app_env,
                        "recommendation_scope": scope_key,
                        "customer_company_id": str(customer_company_id),
                        "owner_member_id": str(owner.id),
                        "parent_run_id": str(run.id),
                        "excluded_dates": [value.isoformat() for value in excluded_dates],
                        "refresh_reason": (run.source_refs or {}).get("refresh_reason"),
                    },
                    input_snapshot=jsonable_encoder(schedule_input),
                    output_snapshot=None,
                    evidence=None,
                    error_message=None,
                    error_code=None,
                    current_stage_code="queued",
                    attempt_count=0,
                    request_snapshot={},
                    request_hash=None,
                    scope_key=f"contract_schedule:{run.id}",
                    payload_expires_at=None,
                    payload_redacted_at=None,
                    lease_owner=None,
                    lease_expires_at=None,
                    heartbeat_at=None,
                    next_attempt_at=now,
                    input_tokens=None,
                    output_tokens=None,
                    total_tokens=None,
                    created_at=now,
                    started_at=None,
                    finished_at=None,
                )
            )
            await session.commit()
            return True

        if run.agent_code != "schedule_management":
            return False
        if (run.output_snapshot or {}).get("decision") != "valid":
            return False
        owner_member_id = _source_uuid(run.source_refs, "owner_member_id")
        if owner_member_id is None:
            return False
        # 이 실행 중 더 최신 트리거가 들어왔다면 낡은 날짜를 잠깐이라도 카드에 덮어쓰지
        # 않는다. 최신 1건을 즉시 깨워 그 결과만 화면에 남긴다.
        if await _wake_latest_for_run(session, run):
            await session.commit()
            return False
        already_saved = (
            await session.execute(
                select(ContractNextMeetingSuggestion.schedule_management_run_id).where(
                    ContractNextMeetingSuggestion.scope_key == scope_key
                )
            )
        ).scalar_one_or_none()
        if already_saved == run.id:
            return False
        target_date_value = (run.input_snapshot or {}).get("target_date")
        if not target_date_value:
            return False
        await _upsert_suggestion(
            session,
            run.team_id,
            None,
            run.id,
            scope_key=scope_key,
            customer_company_id=customer_company_id,
            customer_contact_id=_source_uuid(run.source_refs, "customer_contact_id"),
            owner_member_id=owner_member_id,
            source_report_id=_source_uuid(run.source_refs, "report_id"),
            source_activity_id=_source_uuid(run.source_refs, "activity_id"),
            target_date=date.fromisoformat(str(target_date_value)),
            target_time=(
                time.fromisoformat(str(run.input_snapshot["target_time"]))
                if (run.input_snapshot or {}).get("target_time")
                else None
            ),
            excluded_dates=_source_dates(run.source_refs, "excluded_dates"),
            refresh_reason=(run.source_refs or {}).get("refresh_reason"),
        )
        return True


async def resume_pending(limit: int = 20) -> int:
    """재시작 전에 완료됐지만 후속 단계가 끊긴 영속 작업을 다시 연결한다."""
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        child = aliased(AgentRun)
        child_exists = (
            select(child.id)
            .where(
                child.parent_run_id == AgentRun.id,
                child.agent_code == "schedule_management",
            )
            .exists()
        )
        saved_exists = (
            select(ContractNextMeetingSuggestion.id)
            .where(
                ContractNextMeetingSuggestion.schedule_management_run_id == AgentRun.id
            )
            .exists()
        )
        run_ids = list(
            (
                await session.execute(
                    select(AgentRun.id)
                    .where(
                        AgentRun.status_code == "completed",
                        AgentRun.agent_code.in_(
                            ("contract_management_next_meeting", "schedule_management")
                        ),
                        AgentRun.source_refs["durable_pipeline"].astext == "true",
                        or_(
                            and_(
                                AgentRun.agent_code == "contract_management_next_meeting",
                                AgentRun.output_snapshot["next_meeting_suggestion"]
                                .astext.is_not(None),
                                ~child_exists,
                            ),
                            and_(
                                AgentRun.agent_code == "schedule_management",
                                AgentRun.output_snapshot["decision"].astext == "valid",
                                ~saved_exists,
                            ),
                        ),
                    )
                    .order_by(AgentRun.finished_at.asc().nullsfirst())
                    .limit(limit)
                )
            )
            .scalars()
            .all()
        )
    resumed = 0
    for candidate_id in run_ids:
        resumed += int(await resume_completed(candidate_id))
    return resumed


def _source_uuid(source_refs: dict | None, key: str) -> UUID | None:
    try:
        return UUID(str((source_refs or {}).get(key)))
    except (TypeError, ValueError):
        return None


def _source_dates(source_refs: dict | None, key: str) -> list[date]:
    values = (source_refs or {}).get(key) or []
    parsed = []
    for value in values:
        try:
            parsed.append(date.fromisoformat(str(value)))
        except (TypeError, ValueError):
            continue
    return parsed


def _company_scope(customer_company_id: UUID) -> str:
    return f"company:{customer_company_id}"


async def _owner_member_id(session: AsyncSession, run: AgentRun) -> UUID | None:
    owner_member_id = _source_uuid(run.source_refs, "owner_member_id")
    if owner_member_id is not None:
        return owner_member_id
    # 고객사 단위로 통일하기 전에 딜 트리거로 예약된 실행은 담당자를 딜에서 찾는다.
    sales_deal_id = _source_uuid(run.source_refs, "sales_deal_id")
    deal = await _open_deal(session, sales_deal_id) if sales_deal_id is not None else None
    return deal.owner_member_id if deal is not None else None


async def _lock_scope(session: AsyncSession, scope_key: str) -> None:
    """동시에 들어온 트리거가 서로의 최신 queued 행을 놓치지 않게 고객사 단위로 직렬화한다."""
    await session.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:key))"),
        {"key": f"contract_next_meeting:{scope_key}"},
    )


async def _active_scope_run_id(
    session: AsyncSession, scope_key: str, now: datetime
) -> UUID | None:
    """lease가 살아 있는 실제 실행만 찾는다. 완료 시각 기반 쿨다운은 두지 않는다."""
    return (
        await session.execute(
            select(AgentRun.id)
            .where(
                AgentRun.source_refs["recommendation_scope"].astext == scope_key,
                AgentRun.agent_code.in_(
                    ("contract_management_next_meeting", "schedule_management")
                ),
                AgentRun.status_code == "running",
                AgentRun.lease_expires_at > now,
            )
            .limit(1)
        )
    ).scalar_one_or_none()


async def _wake_latest_for_run(
    session: AsyncSession, run: AgentRun, *, excluding: UUID | None = None
) -> bool:
    """실행 중 쌓인 같은 고객사의 최신 트리거 1건을 즉시 실행 가능 상태로 당긴다."""
    customer_company_id = _source_uuid(run.source_refs, "customer_company_id")
    if customer_company_id is None:
        return False
    conditions = [
        AgentRun.agent_code == "contract_management_next_meeting",
        AgentRun.status_code == "queued",
        AgentRun.source_refs["durable_pipeline"].astext == "true",
        AgentRun.source_refs["recommendation_scope"].astext
        == _company_scope(customer_company_id),
    ]
    if excluding is not None:
        conditions.append(AgentRun.id != excluding)
    latest_id = (
        await session.execute(
            select(AgentRun.id)
            .where(*conditions)
            .order_by(AgentRun.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if latest_id is None:
        return False
    await session.execute(
        update(AgentRun).where(AgentRun.id == latest_id).values(next_attempt_at=datetime.now(UTC))
    )
    return True


async def _open_deal(session: AsyncSession, sales_deal_id: UUID) -> SalesDeal | None:
    return (
        await session.execute(
            select(SalesDeal).where(SalesDeal.id == sales_deal_id, SalesDeal.deleted_at.is_(None))
        )
    ).scalar_one_or_none()


async def _member(session: AsyncSession, member_id: UUID) -> Member | None:
    return (
        await session.execute(select(Member).where(Member.id == member_id))
    ).scalar_one_or_none()


async def _upsert_suggestion(
    session: AsyncSession,
    team_id: UUID,
    sales_deal_id: UUID | None,
    schedule_run_id: UUID,
    *,
    scope_key: str | None = None,
    customer_company_id: UUID | None = None,
    customer_contact_id: UUID | None = None,
    owner_member_id: UUID | None = None,
    source_report_id: UUID | None = None,
    source_activity_id: UUID | None = None,
    target_date: date,
    target_time: time | None,
    excluded_dates: list[date],
    refresh_reason: str | None,
) -> None:
    """추천 범위(고객사)당 활성 제안은 최대 1개다. 새 실행이 나오면 전체를 덮어쓴다."""
    now = datetime.now(UTC)
    scope_key = scope_key or (f"deal:{sales_deal_id}" if sales_deal_id else None)
    if scope_key is None or customer_company_id is None or owner_member_id is None:
        return
    existing = (
        await session.execute(
            select(ContractNextMeetingSuggestion).where(
                ContractNextMeetingSuggestion.scope_key == scope_key
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        existing.schedule_management_run_id = schedule_run_id
        existing.customer_company_id = customer_company_id
        existing.customer_contact_id = customer_contact_id
        existing.owner_member_id = owner_member_id
        existing.source_report_id = source_report_id
        existing.source_activity_id = source_activity_id
        existing.sales_deal_id = sales_deal_id
        existing.target_date = target_date
        existing.target_time = target_time
        existing.selected_duration_minutes = None
        existing.excluded_dates = [value.isoformat() for value in excluded_dates]
        existing.refresh_reason = refresh_reason
        existing.applied_activity_id = None
        existing.status_code = "pending"
        existing.updated_at = now
        await session.commit()
        return
    session.add(
        ContractNextMeetingSuggestion(
            id=uuid4(),
            team_id=team_id,
            scope_key=scope_key,
            customer_company_id=customer_company_id,
            customer_contact_id=customer_contact_id,
            owner_member_id=owner_member_id,
            source_report_id=source_report_id,
            source_activity_id=source_activity_id,
            sales_deal_id=sales_deal_id,
            schedule_management_run_id=schedule_run_id,
            target_date=target_date,
            target_time=target_time,
            selected_duration_minutes=None,
            excluded_dates=[value.isoformat() for value in excluded_dates],
            refresh_reason=refresh_reason,
            applied_activity_id=None,
            status_code="pending",
            created_at=now,
            updated_at=now,
        )
    )
    try:
        await session.commit()
    except IntegrityError:
        # 같은 고객사에 트리거가 동시에 겹쳐 UNIQUE(scope_key) 에 걸렸다 — 다른 실행이
        # 이미 upsert했다는 뜻이니 이 결과는 버리고 조용히 넘어간다.
        await session.rollback()
