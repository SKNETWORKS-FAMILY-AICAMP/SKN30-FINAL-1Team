"""타임라인 하나를 누적 깊이별 평가 케이스로 자른다.

브리핑은 실행 시점까지 쌓인 보고서만 본다. 그래서 같은 타임라인이라도 t=1 과 t=30 은
서로 다른 입력이고, 그 시점에 열려 있던 주제도 다르다. 이 스크립트는 타임라인 하나에서
t 별 ``input.json`` 과 ``golden.json`` 을 만든다.

입력 스냅샷은 ``generate_briefing(snapshot)`` 에 그대로 넣을 수 있는 형태로 만든다.
``_report_scope`` 는 넣지 않는다 — 그 키가 없으면 도구가 DB 대신 스냅샷 값을 돌려주므로
실제 도구 호출을 그대로 두면서 재현 가능한 평가가 된다.

사용법::

    python scripts/build_briefing_evaluation.py \
        --timeline evaluation_data/briefing/v1/timelines/hanbit \
        --out evaluation_data/briefing/v1/cases \
        --depths 1 3 5 10 30
"""

from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

# 브리핑 도구가 한 번에 돌려주는 최신 보고서 수. 이 창을 넘어간 보고서는 RAG 로만 닿는다.
RECENT_WINDOW = 3
SEOUL = "+09:00"


def meeting_date(timeline: dict[str, Any], no: int) -> date:
    first = date.fromisoformat(timeline["first_meeting_date"])
    return first + timedelta(days=timeline["meeting_interval_days"] * (no - 1))


def report_id(timeline_id: str, no: int) -> str:
    return f"report-{timeline_id}-{no:02d}"


def to_record(timeline: dict[str, Any], report: dict[str, Any]) -> dict[str, Any]:
    """``report_context._record()`` 가 만드는 모양 그대로 맞춘다."""
    timeline_id = timeline["timeline_id"]
    no = report["no"]
    day = meeting_date(timeline, no)
    deal_titles = {deal["deal_id"]: deal["title"] for deal in timeline["deals"]}
    return {
        "id": report_id(timeline_id, no),
        "submission_id": f"submission-{timeline_id}-{no:02d}",
        "source_activity_id": f"activity-{timeline_id}-{no:02d}",
        "report_date": day.isoformat(),
        "submitted_at": f"{day.isoformat()}T18:00:00{SEOUL}",
        "title": report["title"],
        "meeting_shared": {
            "common_report": report.get("common_body"),
            "unassigned_report": report.get("unassigned_body"),
        },
        "deal_reports": [
            {
                "sales_deal_id": item["deal_id"],
                "title": deal_titles.get(item["deal_id"], item["deal_id"]),
                "body": item["body"],
            }
            for item in report.get("deals") or []
        ],
    }


def fill_noise(timeline: dict[str, Any], reports: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """핵심 보고서만 쓰고 나머지는 노이즈로 채운다.

    깊은 체인에서 재려는 건 "많은 사실을 다 담는 능력" 이 아니라 "많은 것 중에 고르는
    능력" 이다. 그래서 대부분은 하이라이트로 올리면 안 되는 일상 기록이어야 한다.
    """
    by_no = {report["no"]: report for report in reports}
    topics = timeline.get("noise_topics") or ["정기 방문"]
    filled = []
    for no in range(1, timeline["meeting_count"] + 1):
        if no in by_no:
            filled.append(by_no[no])
            continue
        label = topics[(no - 1) % len(topics)]
        filled.append(
            {
                "no": no,
                "kind": "noise",
                "title": label,
                "common_body": (
                    f"{label}. 진행 상황만 공유했고 새로 결정되거나 요청된 사항은 없습니다."
                ),
                "deals": [],
            }
        )
    return filled


def stage_at(deal: dict[str, Any], t: int) -> str | None:
    """t 회차까지 진행된 마지막 단계. 아직 열리지 않았으면 None."""
    stage = None
    for step in deal["stage_path"]:
        if step["at"] <= t:
            stage = step["stage_code"]
    return stage


PHASE_BY_STAGE = {
    "needs_validation": ("sales", "in_progress"),
    "product_demo": ("sales", "in_progress"),
    "quote_sent": ("quote", "in_progress"),
    "contract_sent": ("contract", "in_progress"),
    "contract_review": ("contract", "in_progress"),
    "contract_completed": ("contract", "confirmed"),
    "order_in_progress": ("order", "confirmed"),
    "order_delivered": ("order", "confirmed"),
    "closed_cancelled": ("closed", "cancelled"),
}


def deals_at(timeline: dict[str, Any], t: int) -> list[dict[str, Any]]:
    out = []
    for deal in timeline["deals"]:
        if deal["opened_at"] > t:
            continue
        stage = stage_at(deal, t)
        phase, outcome = PHASE_BY_STAGE[stage]
        out.append(
            {
                "id": deal["deal_id"],
                "title": deal["title"],
                "stage_code": stage,
                "stage_phase_code": phase,
                "outcome_code": outcome,
            }
        )
    return out


def documents_at(timeline: dict[str, Any], t: int) -> list[dict[str, Any]]:
    out = []
    for doc in timeline.get("documents") or []:
        if doc["available_from"] > t:
            continue
        out.append(doc)
    return out


def build_document_context(timeline: dict[str, Any], t: int) -> dict[str, Any]:
    """자료요약 Agent(RAG) 조회 결과 자리.

    승인된 자료만 RAG 에 반영되므로 여기에도 승인본만 넣는다. 자료 자체의 품질(승인 상태,
    버전, OCR 정확도)은 자료요약 Agent 평가에서 다루고, 여기서는 주어진 자료를 브리핑이
    어떻게 쓰는지만 본다.
    """
    docs = documents_at(timeline, t)
    summaries = [
        {
            "document_id": doc["document_id"],
            "file_name": doc["file_name"],
            "summary_markdown": doc["summary_markdown"],
        }
        for doc in docs
    ]
    sources = [
        {
            "document_id": doc["document_id"],
            # v13 부터 문서 근거는 chunk_id 가 있어야 source_refs 에 남는다.
            "chunk_id": chunk["chunk_id"],
            "file_name": doc["file_name"],
            "page_start": chunk["page_start"],
            "page_end": chunk["page_end"],
            "content": chunk["content"],
            "score": 0.8,
        }
        for doc in docs
        for chunk in doc.get("chunks") or []
    ]
    return {
        "query": f"{timeline['customer_company']['name']} 계약 견적 납기",
        "summaries": summaries,
        "sources": sources,
    }


def build_input(timeline: dict[str, Any], reports: list[dict[str, Any]], t: int) -> dict[str, Any]:
    """t 회차 미팅까지 끝난 뒤, 다음 미팅 브리핑을 만들 때의 입력 스냅샷."""
    timeline_id = timeline["timeline_id"]
    records = [to_record(timeline, report) for report in reports if report["no"] <= t]
    records.sort(key=lambda item: item["report_date"], reverse=True)
    recent = records[:RECENT_WINDOW]
    older = records[RECENT_WINDOW:]
    # 담당자가 바뀌는 체인이 있다. 브리핑 대상 미팅(t+1 회차) 시점의 담당자를 쓴다.
    meeting_no = t + 1
    contact = next(
        c
        for c in timeline["contacts"]
        if c.get("active_from", 1)
        <= meeting_no
        <= c.get("active_until", timeline["meeting_count"] + 1)
    )
    next_day = meeting_date(timeline, t + 1)
    return {
        "customer_company": timeline["customer_company"],
        "sales_deals": deals_at(timeline, t),
        "approved_next_meeting": {
            "activity_id": f"activity-{timeline_id}-t{t:02d}-next",
            "title": f"{timeline['customer_company']['name']} 정기 미팅",
            "starts_at": f"{next_day.isoformat()}T14:00:00{SEOUL}",
            "ends_at": f"{next_day.isoformat()}T15:00:00{SEOUL}",
            "location": f"{timeline['customer_company']['name']} 본관 회의실",
            "note": "진행 중인 건 점검",
            "customer_contact": {
                "id": contact["id"],
                "name": contact["name"],
                "department": contact["department"],
                "job_title": contact["job_title"],
            },
        },
        "briefing_mode": "first_meeting" if t == 0 else "relationship",
        "recent_reports": recent,
        "has_older_reports": bool(older),
        # RAG 가 돌려줄 과거 보고서. 원문까지 넣어 두면 LLM 이 report_ids 로 DB 를 다시
        # 읽으려 하지 않는다(그 경로는 _report_scope 가 있어야 동작한다).
        "historical_report_context": older,
        "report_search": {"method": "keyword", "status": "completed"},
        "report_search_query": f"{timeline['customer_company']['name']} 미해결 이슈",
        "document_context": build_document_context(timeline, t),
    }


def build_golden(timeline: dict[str, Any], t: int) -> dict[str, Any]:
    """타임라인의 주제 상태를 t 시점으로 계산한다. 슬라이스마다 손으로 쓰지 않는다."""
    timeline_id = timeline["timeline_id"]
    recent_nos = {no for no in range(max(1, t - RECENT_WINDOW + 1), t + 1)}
    required, must_not, changed = [], [], []

    for topic in timeline["topics"]:
        if topic["opened_at"] > t:
            continue
        resolved_at = topic.get("resolved_at")
        if resolved_at is not None and resolved_at <= t:
            must_not.append(
                {
                    "topic_id": topic["topic_id"],
                    "label": topic["label"],
                    "reason": "해결됨",
                    "resolved_by": topic.get("evidence_resolved", []),
                    "expectation": "must_not_appear",
                }
            )
            continue
        last_mentioned = topic["opened_at"]
        intent = topic["intent"]
        evidence = topic["evidence_open"]
        # 값이 여러 번 바뀌는 주제는 t 시점까지 알려진 값만 정답으로 쓴다.
        # 최종 값을 그대로 쓰면 그 이전 슬라이스가 미래 정보를 요구하게 된다.
        history = [v for v in topic.get("values") or [] if v["at"] <= t]
        if history:
            current = history[-1]
            intent = topic["intent"].format(value=current["value"])
            evidence = [current["evidence"]]
            last_mentioned = current["at"]
        entry = {
            "topic_id": topic["topic_id"],
            "label": topic["label"],
            "intent": intent,
            "deal_id": topic.get("deal_id"),
            "importance": topic["importance"],
            "evidence": evidence,
            "last_mentioned_at": last_mentioned,
            "in_recent_window": last_mentioned in recent_nos,
            "requires_rag": last_mentioned not in recent_nos,
            "expectation": (
                "must_appear" if topic["importance"] in ("critical", "high") else "may_appear"
            ),
        }
        if topic.get("conflict_between"):
            entry["must_flag_conflict"] = topic["conflict_between"]
        required.append(entry)
        if len(history) >= 2:
            changed.append(
                {
                    "topic_id": topic["topic_id"],
                    "from": history[-2]["value"],
                    "to": history[-1]["value"],
                    "expectation": "must_show_latest_only",
                }
            )
        if topic.get("changed") and topic["changed"]["at"] <= t:
            changed.append(
                {
                    "topic_id": topic["topic_id"],
                    "from": topic["changed"]["from"],
                    "to": topic["changed"]["to"],
                    "expectation": "must_show_latest_only",
                }
            )

    stalled = [
        {
            "deal_id": deal["deal_id"],
            "title": deal["title"],
            "stalled_rounds": t - deal["stalled_since"],
            "note": deal.get("stall_note"),
        }
        for deal in timeline["deals"]
        if deal.get("stalled_since") and deal["stalled_since"] <= t
    ]

    has_state_change = bool(must_not or changed)
    return {
        "timeline_id": timeline_id,
        "t": t,
        "briefing_mode": "first_meeting" if t == 0 else "relationship",
        "required_topics": [item for item in required if item["expectation"] == "must_appear"],
        "allowed_topics": [item for item in required if item["expectation"] == "may_appear"],
        "must_not_appear": must_not,
        "changed_values": changed,
        "stalled_deals": stalled,
        "expected_rag_calls_min": 1 if any(item["requires_rag"] for item in required) else 0,
        "expected_rag_calls_max": 0 if t <= RECENT_WINDOW else None,
        "forbidden_claims": timeline.get("forbidden_claims", []),
        "forbidden_missing_information": (["과거 보고서 없음", "연결된 딜 없음"] if t == 0 else []),
        # 상태 변화가 없는 슬라이스에서는 상태 추적 15점을 빼고 85점 만점으로 환산한다.
        "scoring": {
            "state_tracking_applies": has_state_change,
            "max_score": 100 if has_state_change else 85,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--timeline", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--depths", nargs="+", type=int, default=[1, 3, 5, 10, 30])
    args = parser.parse_args()

    timeline = json.loads((args.timeline / "timeline.json").read_text(encoding="utf-8"))
    reports = json.loads((args.timeline / "reports.json").read_text(encoding="utf-8"))["reports"]
    reports = fill_noise(timeline, reports)
    timeline_id = timeline["timeline_id"]

    for depth in args.depths:
        if depth > timeline["meeting_count"]:
            raise SystemExit(
                f"깊이 {depth} 가 타임라인 길이 {timeline['meeting_count']} 보다 큽니다"
            )
        # 깊이 1 은 "첫 미팅 브리핑" 이므로 앞선 보고서가 하나도 없는 t=0 상태다.
        t = depth - 1
        case_dir = args.out / f"{timeline_id}-d{depth:02d}"
        case_dir.mkdir(parents=True, exist_ok=True)
        (case_dir / "input.json").write_text(
            json.dumps(build_input(timeline, reports, t), ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        (case_dir / "golden.json").write_text(
            json.dumps(build_golden(timeline, t), ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"{case_dir.name}: t={t} 보고서 {min(t, len(reports))}건")

    manifest = {
        "dataset": "salesluv-briefing-eval-v1",
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "recent_window": RECENT_WINDOW,
        "timelines": [timeline_id],
        "depths": args.depths,
    }
    (args.out / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
