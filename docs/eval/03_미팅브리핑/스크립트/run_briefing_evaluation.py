"""평가 케이스로 실제 브리핑을 생성하고 채점에 필요한 기록을 남긴다.

DB 도 API 도 거치지 않는다. ``generate_briefing(snapshot)`` 을 직접 부르되 스냅샷에
``_report_scope`` 를 넣지 않아, 도구는 실제로 호출되면서 값만 스냅샷에서 나온다.

``_validate_briefing_output`` 은 근거가 없는 하이라이트를 조용히 버린다. 그래서 필터 전
출력을 따로 잡아 둔다. 그러지 않으면 "모델이 안 만든 것" 과 "필터가 지운 것" 을 구분할 수
없다.

사용법::

    python scripts/run_briefing_evaluation.py \
        --cases evaluation_data/briefing/v1/cases \
        --out evaluation_results/briefing/run-001 \
        --only hanbit-d30
"""

from __future__ import annotations

import argparse
import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Any

from app.agents import contract_management

# 평가용 고정 범위. 실제 DB 를 찾지 않도록 조회 함수를 전부 스냅샷으로 바꿔 끼운다.
FAKE_SCOPE = {
    "team_id": "00000000-0000-0000-0000-000000000001",
    "customer_company_id": "00000000-0000-0000-0000-000000000002",
}


class _NoSession:
    async def __aenter__(self):
        return None

    async def __aexit__(self, *exc):
        return False


def _fake_sessionmaker():
    return lambda: _NoSession()


def _tool_calls(messages: list[Any]) -> list[dict[str, Any]]:
    calls = []
    for message in messages:
        for call in getattr(message, "tool_calls", None) or []:
            if isinstance(call, dict):
                calls.append({"name": call.get("name"), "args": call.get("args") or {}})
    return calls


async def run_case(case_dir: Path, out_dir: Path) -> dict[str, Any]:
    snapshot = json.loads((case_dir / "input.json").read_text(encoding="utf-8"))
    if "_report_scope" in snapshot:
        raise SystemExit(f"{case_dir.name}: _report_scope 가 있으면 DB 를 찾습니다")

    # 도구가 RAG 결과에서 고른 보고서 원문을 다시 읽으려 하면 DB 로 간다. 그 경로도
    # 스냅샷으로 받아 주어야 실제 도구 호출을 그대로 두면서 재현이 된다.
    lookup = {
        str(record["id"]): record
        for record in (snapshot.get("recent_reports") or [])
        + (snapshot.get("historical_report_context") or [])
    }
    snapshot = dict(snapshot, _report_scope=FAKE_SCOPE)

    async def fake_reports_by_ids(session, *, member, customer_company_id, report_ids):
        return [lookup[str(rid)] for rid in report_ids if str(rid) in lookup]

    async def fake_search_historical(session, *, member, customer_company_id, query, search_info):
        search_info.update({"method": "keyword", "status": "completed", "query": query})
        return list(snapshot.get("historical_report_context") or [])

    captured: dict[str, Any] = {}
    original_validate = contract_management._validate_briefing_output
    original_by_ids = contract_management.report_context.reports_by_ids
    original_search = contract_management.report_context.search_historical_reports
    original_sessionmaker = contract_management.get_sessionmaker
    contract_management.report_context.reports_by_ids = fake_reports_by_ids
    contract_management.report_context.search_historical_reports = fake_search_historical
    contract_management.get_sessionmaker = _fake_sessionmaker

    def spy_validate(output, snap, runtime_report_ids=None):
        captured["raw"] = output.model_dump(mode="json")
        result = original_validate(output, snap, runtime_report_ids)
        captured["filtered"] = result.model_dump(mode="json")
        return result

    contract_management._validate_briefing_output = spy_validate

    # 도구 호출 기록은 agent 상태에 남지만 generate_briefing 이 돌려주지 않는다.
    # create_agent 를 감싸 invoke 결과를 가로챈다.
    original_create_agent = contract_management.create_agent

    def spy_create_agent(*args, **kwargs):
        agent = original_create_agent(*args, **kwargs)
        original_ainvoke = agent.ainvoke

        async def ainvoke(*a, **kw):
            state = await original_ainvoke(*a, **kw)
            captured["messages"] = state.get("messages") or []
            return state

        agent.ainvoke = ainvoke
        return agent

    contract_management.create_agent = spy_create_agent

    started = datetime.now().astimezone()
    error = None
    returned = None
    try:
        returned = await contract_management.generate_briefing(snapshot)
    except Exception as exc:  # 실행 실패도 결과의 일부다
        error = f"{type(exc).__name__}: {exc}"
    finally:
        contract_management._validate_briefing_output = original_validate
        contract_management.create_agent = original_create_agent
        contract_management.report_context.reports_by_ids = original_by_ids
        contract_management.report_context.search_historical_reports = original_search
        contract_management.get_sessionmaker = original_sessionmaker

    # 첫 미팅은 조건이 맞으면 LLM 을 타지 않고 고정 하이라이트로 조기 return 한다.
    # 그 경로에서는 _validate_briefing_output 이 호출되지 않으므로 반환값을 그대로 쓴다.
    deterministic = captured.get("raw") is None and returned is not None
    if deterministic:
        dumped = returned.model_dump(mode="json")
        captured["raw"] = dumped
        captured["filtered"] = dumped

    calls = _tool_calls(captured.get("messages") or [])
    record = {
        "case": case_dir.name,
        "deterministic_path": deterministic,
        "prompt_version": contract_management.GENERATE_BRIEFING_PROMPT_VERSION,
        "started_at": started.isoformat(timespec="seconds"),
        "elapsed_seconds": round((datetime.now().astimezone() - started).total_seconds(), 2),
        "error": error,
        "raw_output": captured.get("raw"),
        "filtered_output": captured.get("filtered"),
        "dropped_highlight_count": (
            len((captured.get("raw") or {}).get("highlights") or [])
            - len((captured.get("filtered") or {}).get("highlights") or [])
        )
        if captured.get("raw") is not None
        else None,
        "tool_calls": calls,
        "rag_call_count": sum(call["name"] == "search_historical_reports" for call in calls),
        "recent_read_called": any(
            call["name"] == "read_recent_reports" and not call["args"].get("report_ids")
            for call in calls
        ),
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"{case_dir.name}.json").write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return record


async def main_async(args: argparse.Namespace) -> None:
    case_dirs = sorted(p for p in args.cases.iterdir() if p.is_dir())
    if args.only:
        case_dirs = [p for p in case_dirs if p.name in args.only]
    for case_dir in case_dirs:
        record = await run_case(case_dir, args.out)
        status = record["error"] or (
            f"하이라이트 {len((record['filtered_output'] or {}).get('highlights') or [])}개"
            f" (필터로 {record['dropped_highlight_count']}개 삭제)"
            f" · RAG {record['rag_call_count']}회"
        )
        print(f"{record['case']}: {status}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--only", nargs="*", default=None)
    asyncio.run(main_async(parser.parse_args()))


if __name__ == "__main__":
    main()
