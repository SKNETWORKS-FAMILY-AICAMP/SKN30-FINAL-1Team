"""채점 결과를 깊이별·체인별로 모은다.

깊이가 이 평가의 축이므로 총평균보다 **깊이별 평균** 이 먼저 보여야 한다.
점수는 만점이 다를 수 있어(상태 추적이 없는 슬라이스는 85점) 백분율로 모은다.

사용법::

    python scripts/summarize_briefing.py --judged evaluation_results/briefing/run-002/judged
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Any

DEPTH_ORDER = ["d01", "d03", "d05", "d10", "d30"]


def mean(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 1) if values else None


def load(judged: Path) -> list[dict[str, Any]]:
    return [json.loads(path.read_text(encoding="utf-8")) for path in sorted(judged.glob("*.json"))]


def summarize(results: list[dict[str, Any]]) -> dict[str, Any]:
    by_depth: dict[str, list[dict]] = defaultdict(list)
    by_chain: dict[str, list[dict]] = defaultdict(list)
    for item in results:
        chain, depth = item["case"].rsplit("-", 1)
        by_depth[depth].append(item)
        by_chain[chain].append(item)

    def block(items: list[dict]) -> dict[str, Any]:
        percents = [item["score"]["percent"] for item in items]
        gates = [item["gates"] for item in items]
        judgements = [item["judgement"] for item in items]
        missed = sum(
            1
            for judgement in judgements
            for topic in judgement["required_topics"]
            if topic["verdict"] == "missed"
        )
        partial = sum(
            1
            for judgement in judgements
            for topic in judgement["required_topics"]
            if topic["verdict"] == "partial"
        )
        return {
            "cases": len(items),
            "percent_mean": mean(percents),
            "percent_min": round(min(percents), 1) if percents else None,
            "required_missed": missed,
            "required_partial": partial,
            "stale_shown": sum(
                sum(1 for topic in judgement["must_not_appear"] if topic["appeared"])
                for judgement in judgements
            ),
            "critical_errors": sum(len(judgement["critical_errors"]) for judgement in judgements),
            "invalid_source_refs": sum(len(gate["invalid_source_refs"]) for gate in gates),
            "rag_min_failed": sum(1 for gate in gates if not gate["rag_min_ok"]),
            "rag_max_failed": sum(1 for gate in gates if not gate["rag_max_ok"]),
            "dropped_highlights": sum(gate.get("dropped_highlight_count") or 0 for gate in gates),
        }

    return {
        "overall": block(results),
        "by_depth": {depth: block(by_depth[depth]) for depth in DEPTH_ORDER if depth in by_depth},
        "by_chain": {chain: block(items) for chain, items in sorted(by_chain.items())},
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--judged", required=True, type=Path)
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()

    results = load(args.judged)
    if not results:
        raise SystemExit("채점 결과가 없습니다")
    summary = summarize(results)

    header = (
        f"{'깊이':<6}{'건수':>4}{'평균%':>8}{'최저%':>8}"
        f"{'누락':>5}{'부분':>5}{'재등장':>7}{'중대':>5}{'RAG부족':>8}"
    )
    print(header)
    for depth, item in summary["by_depth"].items():
        print(
            f"{depth:<6}{item['cases']:>4}{item['percent_mean']:>8}{item['percent_min']:>8}"
            f"{item['required_missed']:>5}{item['required_partial']:>5}{item['stale_shown']:>7}"
            f"{item['critical_errors']:>5}{item['rag_min_failed']:>8}"
        )
    print()
    print(f"{'체인':<12}{'건수':>4}{'평균%':>8}{'최저%':>8}{'누락':>5}{'중대':>5}")
    for chain, item in summary["by_chain"].items():
        print(
            f"{chain:<12}{item['cases']:>4}{item['percent_mean']:>8}{item['percent_min']:>8}"
            f"{item['required_missed']:>5}{item['critical_errors']:>5}"
        )
    overall = summary["overall"]
    print()
    print(
        f"전체 {overall['cases']}건 · 평균 {overall['percent_mean']}% · "
        f"필수 누락 {overall['required_missed']} · 부분 {overall['required_partial']} · "
        f"중대 오류 {overall['critical_errors']} · 근거 오류 {overall['invalid_source_refs']} · "
        f"필터 삭제 {overall['dropped_highlights']}"
    )

    if args.out:
        args.out.write_text(
            json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )


if __name__ == "__main__":
    main()
