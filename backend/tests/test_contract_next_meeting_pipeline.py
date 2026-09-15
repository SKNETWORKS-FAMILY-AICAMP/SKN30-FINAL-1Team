"""트리거 이후 "다음 미팅 제안 → 일정 후보"를 이어 실행하는 선계산 파이프라인을 확인한다.

실제 체이닝은 백그라운드에서 돌고 실패를 스스로 삼키므로, 여기서는 중복 실행 방어와
제안 상태 저장처럼 결정적으로 확인할 수 있는 부분만 본다
(docs/technical/multiagent/계약에이전트_설계.md 3장).
"""

import asyncio
from datetime import UTC, date, datetime, time, timedelta
from uuid import UUID, uuid4

from app.models.agent import ContractNextMeetingSuggestion
from app.models.crm import CustomerCompany
from app.models.sales import SalesDeal
from app.models.workspace import Member
from app.services import contract_next_meeting_pipeline as pipeline

NOW = datetime(2026, 8, 29, 9, tzinfo=UTC)
_MISSING = object()


class _Result:
    def __init__(self, *, scalar=_MISSING):
        self.scalar = scalar

    def scalar_one_or_none(self):
        assert self.scalar is not _MISSING
        return self.scalar


class _Db:
    def __init__(self, *results: _Result):
        self.results = list(results)
        self.statements = []
        self.parameters = []
        self.commit_count = 0

    async def execute(self, statement, parameters=None):
        self.statements.append(statement)
        self.parameters.append(parameters)
        assert self.results, "예상보다 많은 쿼리가 실행됐습니다."
        return self.results.pop(0)

    async def commit(self):
        self.commit_count += 1


def _member() -> Member:
    return Member(
        id=uuid4(),
        team_id=uuid4(),
        display_name="합성 담당자",
        role_code="member",
        job_title="영업 담당자",
        active=True,
    )


def _deal(owner: Member) -> SalesDeal:
    company = CustomerCompany(id=uuid4(), team_id=owner.team_id, name="합성 병원")
    return SalesDeal(
        id=uuid4(),
        team_id=owner.team_id,
        deal_no="D-2026-0001",
        customer_company_id=company.id,
        customer_contact_id=None,
        owner_member_id=owner.id,
        product_id=uuid4(),
        sales_pipeline_id=uuid4(),
        sales_pipeline_stage_id=uuid4(),
        title="합성 계약건",
        description=None,
        sales_deal_type_id=uuid4(),
        deal_amount=1_000_000,
        opened_on=NOW.date(),
        stage_position=0,
        deleted_at=None,
        created_at=NOW,
        updated_at=NOW,
    )


def _suggestion(deal: SalesDeal, schedule_run_id: UUID, *, status_code: str = "pending"):
    return ContractNextMeetingSuggestion(
        id=uuid4(),
        team_id=deal.team_id,
        scope_key=f"deal:{deal.id}",
        customer_company_id=deal.customer_company_id,
        customer_contact_id=deal.customer_contact_id,
        owner_member_id=deal.owner_member_id,
        source_report_id=None,
        source_activity_id=None,
        sales_deal_id=deal.id,
        schedule_management_run_id=schedule_run_id,
        target_date=date(2026, 9, 20),
        target_time=None,
        selected_duration_minutes=None,
        excluded_dates=[],
        refresh_reason=None,
        applied_activity_id=None,
        status_code=status_code,
        created_at=NOW,
        updated_at=NOW,
    )


def test_queue_defers_the_chain_to_the_background():
    """트리거가 된 요청은 파이프라인 실패와 무관해야 한다 — 응답 뒤로 미룬다."""

    class _Background:
        def __init__(self):
            self.tasks = []

        def add_task(self, func, *args):
            self.tasks.append((func, args))

    background = _Background()
    sales_deal_id = uuid4()
    pipeline.queue(background, sales_deal_id, {"report_id": "r-1"})

    assert background.tasks == [
        (pipeline._run_deal_trigger, (sales_deal_id, {"report_id": "r-1"}))
    ]


def test_report_queue_runs_once_without_a_sales_deal():
    class _Background:
        def __init__(self):
            self.tasks = []

        def add_task(self, func, *args):
            self.tasks.append((func, args))

    background = _Background()
    company_id = uuid4()
    report_id = uuid4()
    activity_id = uuid4()

    pipeline.queue_report(background, company_id, report_id, activity_id)

    assert background.tasks == [
        (pipeline._run_report_trigger, (company_id, report_id, activity_id))
    ]


class _Context:
    async def __aenter__(self):
        return object()

    async def __aexit__(self, *_exc):
        return False


def test_company_pipeline_passes_the_submitted_report_to_the_snapshot(monkeypatch):
    """최신 5건 밖이어도 방금 확정한 보고서는 계약관리 입력에 반드시 포함한다."""
    monkeypatch.setattr(pipeline.settings.__class__, "llm_configured", property(lambda _self: True))
    owner = _member()
    company_id = uuid4()
    report_id = uuid4()
    captured = []

    async def _build(db, member, customer_company_id, **kwargs):
        captured.append((member, customer_company_id, kwargs))
        raise pipeline.HTTPException(404, "stop_after_capture")

    async def _noop(*_args):
        return None

    async def _member_result(*_args):
        return owner

    monkeypatch.setattr(pipeline, "get_sessionmaker", lambda: lambda: _Context())
    monkeypatch.setattr(pipeline, "_lock_scope", _noop)
    monkeypatch.setattr(pipeline, "_member", _member_result)
    monkeypatch.setattr(pipeline.contract_schedule_snapshots, "build_next_meeting_snapshot", _build)

    asyncio.run(
        pipeline._run_company_pipeline(company_id, owner.id, {}, required_report_id=report_id)
    )

    assert captured == [
        (owner, company_id, {"required_report_id": report_id, "excluded_dates": None})
    ]


def test_deal_trigger_enters_the_same_company_pipeline(monkeypatch):
    """딜에서 출발한 트리거도 딜로 좁히지 않고 그 딜의 고객사 추천으로 들어간다."""
    monkeypatch.setattr(pipeline.settings.__class__, "llm_configured", property(lambda _self: True))
    owner = _member()
    deal = _deal(owner)
    captured = []

    async def _deal_result(*_args):
        return deal

    async def _company_pipeline(*args, **kwargs):
        captured.append((args, kwargs))
        return True

    monkeypatch.setattr(pipeline, "get_sessionmaker", lambda: lambda: _Context())
    monkeypatch.setattr(pipeline, "_open_deal", _deal_result)
    monkeypatch.setattr(pipeline, "_run_company_pipeline", _company_pipeline)

    assert asyncio.run(pipeline._run_deal_trigger(deal.id, {"sales_deal_id": str(deal.id)}))
    assert captured == [
        (
            (
                deal.customer_company_id,
                owner.id,
                {"sales_deal_id": str(deal.id), "trigger_sales_deal_id": str(deal.id)},
            ),
            {"customer_contact_id": None},
        )
    ]


def test_regenerate_does_not_require_the_original_report(monkeypatch):
    captured = []

    async def _company_pipeline(*args, **kwargs):
        captured.append((args, kwargs))
        return True

    monkeypatch.setattr(pipeline, "_run_company_pipeline", _company_pipeline)
    company_id, owner_id, report_id = uuid4(), uuid4(), uuid4()

    asyncio.run(
        pipeline.regenerate(
            company_id, owner_id, report_id=report_id, excluded_dates=[date(2026, 9, 20)]
        )
    )

    args, kwargs = captured[0]
    assert args == (company_id, owner_id, {"refresh": "explicit", "report_id": str(report_id)})
    assert "required_report_id" not in kwargs
    assert kwargs["excluded_dates"] == [date(2026, 9, 20)]


def test_lock_scope_uses_a_company_scoped_advisory_lock():
    """동시에 들어온 요청은 고객사별 잠금으로 최신 queued 행을 안전하게 교체한다."""
    scope_key = pipeline._company_scope(uuid4())
    db = _Db(_Result())

    asyncio.run(pipeline._lock_scope(db, scope_key))
    assert "pg_advisory_xact_lock" in str(db.statements[0])
    assert scope_key in db.parameters[0]["key"]


def test_active_run_only_blocks_a_live_running_job():
    """완료 시각 쿨다운 없이 lease가 살아 있는 실행만 후속 요청을 대기시킨다."""
    scope_key = pipeline._company_scope(uuid4())
    running_id = uuid4()
    found_db = _Db(_Result(scalar=running_id))
    assert asyncio.run(pipeline._active_scope_run_id(found_db, scope_key, NOW)) == running_id

    empty_db = _Db(_Result(scalar=None))
    assert asyncio.run(pipeline._active_scope_run_id(empty_db, scope_key, NOW)) is None

    sql = str(empty_db.statements[0])
    assert "source_refs" in sql
    assert "agent_run.status_code =" in sql
    assert "agent_run.lease_expires_at >" in sql
    assert "agent_run.finished_at" not in sql
    assert "agent_run.agent_code IN" in sql


def test_upsert_replaces_the_whole_previous_suggestion():
    owner = _member()
    deal = _deal(owner)
    dismissed = _suggestion(deal, uuid4(), status_code="expired")
    dismissed.updated_at = NOW - timedelta(days=1)
    new_run_id = uuid4()
    db = _Db(_Result(scalar=dismissed))

    asyncio.run(
        pipeline._upsert_suggestion(
            db,
            deal.team_id,
            deal.id,
            new_run_id,
            customer_company_id=deal.customer_company_id,
            owner_member_id=deal.owner_member_id,
            target_date=date(2026, 9, 22),
            target_time=time(11, 0),
            excluded_dates=[date(2026, 9, 20)],
            refresh_reason="이전 날짜가 지났습니다.",
        )
    )

    assert dismissed.status_code == "pending"
    assert dismissed.schedule_management_run_id == new_run_id
    assert dismissed.target_date == date(2026, 9, 22)
    assert dismissed.target_time == time(11, 0)
    assert dismissed.excluded_dates == ["2026-09-20"]
    assert dismissed.updated_at > NOW - timedelta(days=1)
    assert db.commit_count == 1


def test_does_nothing_without_an_llm(monkeypatch):
    """LLM 설정이 없으면 조용히 끝난다 — 실행 기록도 남기지 않는다."""
    monkeypatch.setattr(
        pipeline.settings.__class__, "llm_configured", property(lambda _self: False)
    )
    assert asyncio.run(pipeline._run_company_pipeline(uuid4(), uuid4(), {})) is False
    assert asyncio.run(pipeline._run_deal_trigger(uuid4(), {})) is False


def test_durable_snapshot_converts_dates_for_jsonb():
    """거절 날짜가 포함된 입력도 AgentRun JSONB에 저장할 수 있어야 한다."""
    value = pipeline.jsonable_encoder(
        {"today": date(2026, 9, 15), "meeting_at": time(16, 0), "deal_id": uuid4()}
    )

    assert value["today"] == "2026-09-15"
    assert value["meeting_at"] == "16:00:00"
    assert isinstance(value["deal_id"], str)
