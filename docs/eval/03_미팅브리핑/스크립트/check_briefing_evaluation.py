"""골든셋이 완전한지, 재현되는지, 실행 결과가 성립하는지 검사한다.

품질을 평가하지 않는다. 보고해도 되는 상태인지만 확인한다.

    python scripts/check_briefing_evaluation.py \
        --root evaluation_data/briefing/v1 \
        --run evaluation_results/briefing/run-002
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

RECENT_WINDOW = 3
DEPTHS = [1, 3, 5, 10, 30]

# 실제 확정 보고서는 딜별 본문이 1,000자 안팎이다. 한두 문장짜리 입력으로는 긴 기록에서
# 중요한 것을 고르는 난이도가 사라진다.
CORE_DEAL_MIN = 800
NOISE_MIN = 300
LEAKS = {
    "제작 용어 노출": re.compile(r"사실표|골든|평가용"),
    "회차 메타 서술": re.compile(r"회차|제목은"),
    "괄호 머리표": re.compile(r"\[[^\]]{2,8}\]"),
    "리터럴 줄바꿈": re.compile(r"\\n"),
}
NOISE_NUMBER = re.compile(r"\d[\d,]*\s*(?:만\s*원|원|명|대|건|일|주|개월|년|%|석|회)")

failures: list[str] = []
checked = 0


def check(condition: bool, message: str) -> None:
    global checked
    checked += 1
    if not condition:
        failures.append(message)


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def check_timeline(tl_dir: Path) -> None:
    timeline = load(tl_dir / "timeline.json")
    reports = load(tl_dir / "reports.json")["reports"]
    tid = timeline["timeline_id"]
    count = timeline["meeting_count"]
    numbers = {report["no"] for report in reports}

    check(len(numbers) == len(reports), f"{tid}: 보고서 번호 중복")
    check(
        numbers == set(range(1, count + 1)),
        f"{tid}: 보고서가 1~{count} 회차를 모두 채우지 않음 (노이즈도 실제 본문이어야 함)",
    )
    bounded = [c for c in timeline["contacts"] if "active_from" in c or "active_until" in c]
    for report in reports:
        label = f"{tid}-{report['no']:02d}"
        whole = report["common_body"] + " ".join(i["body"] for i in report.get("deals") or [])
        for contact in bounded:
            active = (
                contact.get("active_from", 1) <= report["no"] <= contact.get("active_until", count)
            )
            # 퇴사한 담당자를 과거 사실로 언급하는 건 괜찮다. 재직 전 이름이 나오면 안 된다.
            if report["no"] < contact.get("active_from", 1):
                check(
                    contact["name"] not in whole,
                    f"{label}: 아직 배정되지 않은 담당자 {contact['name']} 가 등장",
                )
            del active
        check("seed" in report, f"{label}: 사실표(seed) 가 없어 원문과 정답을 대조할 수 없음")
        bodies = [item["body"] for item in report.get("deals") or []]
        text = report["common_body"] + " " + " ".join(bodies)
        for name, pattern in LEAKS.items():
            check(not pattern.search(text), f"{label}: {name}")
        if report["kind"] == "core":
            for body in bodies:
                check(
                    len(body) >= CORE_DEAL_MIN, f"{label}: 딜 본문 {len(body)}자 < {CORE_DEAL_MIN}"
                )
            if "seed" in report:
                seed_deals = {item["deal_id"] for item in report["seed"]["deals"]}
                real_deals = {item["deal_id"] for item in report.get("deals") or []}
                check(seed_deals == real_deals, f"{label}: 사실표와 본문의 딜 구성이 다름")
                seed_text = (
                    report["seed"]["common_body"]
                    + " "
                    + " ".join(item["body"] for item in report["seed"]["deals"])
                )
                for token in set(NOISE_NUMBER.findall(seed_text)):
                    check(
                        token.replace(" ", "") in text.replace(" ", ""),
                        f"{label}: 사실표 값 {token} 이 본문에서 사라짐",
                    )
        else:
            check(len(text) >= NOISE_MIN, f"{label}: 노이즈 본문 {len(text)}자 < {NOISE_MIN}")
            check(not bodies, f"{label}: 노이즈 보고서에 딜별 본문이 있음")
    check(all(1 <= no <= count for no in numbers), f"{tid}: 보고서 번호가 범위를 벗어남")
    check(max(DEPTHS) <= count, f"{tid}: 타임라인이 최대 깊이보다 짧음")

    deal_ids = {deal["deal_id"] for deal in timeline["deals"]}
    for deal in timeline["deals"]:
        ats = [step["at"] for step in deal["stage_path"]]
        check(ats == sorted(ats), f"{tid}/{deal['deal_id']}: 단계 순서가 뒤바뀜")
        check(ats[0] == deal["opened_at"], f"{tid}/{deal['deal_id']}: 첫 단계가 개시 시점과 다름")
        check(ats[-1] <= count, f"{tid}/{deal['deal_id']}: 단계가 타임라인을 넘어감")

    valid_report_ids = {f"report-{tid}-{no:02d}" for no in range(1, count + 1)}
    doc_ids = {doc["document_id"] for doc in timeline.get("documents") or []}
    topic_ids = set()
    for topic in timeline["topics"]:
        tpid = topic["topic_id"]
        check(tpid not in topic_ids, f"{tid}/{tpid}: 주제 ID 중복")
        topic_ids.add(tpid)
        opened, resolved = topic["opened_at"], topic.get("resolved_at")
        check(1 <= opened <= count, f"{tid}/{tpid}: 개시 시점이 범위 밖")
        if resolved is not None:
            check(opened <= resolved <= count, f"{tid}/{tpid}: 해소 시점이 개시보다 앞섬")
        if topic.get("deal_id"):
            check(topic["deal_id"] in deal_ids, f"{tid}/{tpid}: 존재하지 않는 딜 참조")
        for evidence in topic["evidence_open"] + (topic.get("evidence_resolved") or []):
            check(
                evidence in valid_report_ids or evidence in doc_ids,
                f"{tid}/{tpid}: 근거 {evidence} 가 보고서·문서에 없음",
            )
        if topic.get("changed"):
            check(
                topic["changed"]["at"] <= count,
                f"{tid}/{tpid}: 값 변경 시점이 타임라인을 넘어감",
            )

    # 깊이별로 필수 주제가 하나도 없으면 그 케이스는 아무것도 재지 못한다.
    for depth in DEPTHS:
        t = depth - 1
        if t == 0:
            continue
        open_topics = [
            topic
            for topic in timeline["topics"]
            if topic["opened_at"] <= t
            and (topic.get("resolved_at") is None or topic["resolved_at"] > t)
        ]
        check(bool(open_topics), f"{tid}-d{depth:02d}: 그 시점에 열린 주제가 없음")


def check_case(case_dir: Path) -> None:
    name = case_dir.name
    snapshot = load(case_dir / "input.json")
    golden = load(case_dir / "golden.json")
    t = golden["t"]

    check("_report_scope" not in snapshot, f"{name}: _report_scope 가 들어 있어 DB 를 찾게 됨")
    raw = (case_dir / "input.json").read_text(encoding="utf-8")
    check('"seed"' not in raw, f"{name}: 사실표(seed) 가 입력에 새어 들어감")
    check(not LEAKS["제작 용어 노출"].search(raw), f"{name}: 제작 용어가 입력에 노출됨")
    recent = snapshot["recent_reports"]
    older = snapshot["historical_report_context"]
    check(len(recent) <= RECENT_WINDOW, f"{name}: 최근 보고서가 {RECENT_WINDOW}건을 넘음")
    check(len(recent) + len(older) == t, f"{name}: 보고서 수가 t 와 다름")
    check(snapshot["has_older_reports"] == bool(older), f"{name}: has_older_reports 불일치")
    check(
        snapshot["briefing_mode"] == ("first_meeting" if t == 0 else "relationship"),
        f"{name}: briefing_mode 가 t 와 맞지 않음",
    )

    ids = [record["id"] for record in recent + older]
    check(len(ids) == len(set(ids)), f"{name}: 보고서 ID 중복")
    dates = [record["report_date"] for record in recent]
    check(dates == sorted(dates, reverse=True), f"{name}: 최근 보고서가 최신순이 아님")
    if older:
        check(
            max(record["report_date"] for record in older)
            <= min(record["report_date"] for record in recent),
            f"{name}: 창 안팎 보고서 순서가 뒤섞임",
        )

    for source in (snapshot.get("document_context") or {}).get("sources") or []:
        check(bool(source.get("chunk_id")), f"{name}: 문서 근거에 chunk_id 없음")

    required = {topic["topic_id"] for topic in golden["required_topics"]}
    allowed = {topic["topic_id"] for topic in golden["allowed_topics"]}
    gone = {topic["topic_id"] for topic in golden["must_not_appear"]}
    check(not (required & gone), f"{name}: 같은 주제가 필수이면서 금지")
    check(not (allowed & gone), f"{name}: 같은 주제가 허용이면서 금지")
    for changed in golden["changed_values"]:
        check(
            changed["topic_id"] in required | allowed,
            f"{name}: 값 변경 주제가 열린 주제 목록에 없음",
        )
    for topic in golden["required_topics"] + golden["allowed_topics"]:
        for evidence in topic.get("evidence") or []:
            match = re.match(r"report-[a-z]+-(\d+)$", evidence)
            if match:
                check(
                    int(match.group(1)) <= t,
                    f"{name}/{topic['topic_id']}: 근거 {evidence} 가 t={t} 보다 미래",
                )
    for topic in golden["required_topics"]:
        window = {no for no in range(max(1, t - RECENT_WINDOW + 1), t + 1)}
        check(
            topic["requires_rag"] == (topic["last_mentioned_at"] not in window),
            f"{name}/{topic['topic_id']}: requires_rag 계산이 창과 맞지 않음",
        )
    expected_max = 100 if (golden["must_not_appear"] or golden["changed_values"]) else 85
    check(golden["scoring"]["max_score"] == expected_max, f"{name}: 만점 환산이 상태 변화와 불일치")


def check_reproducible(root: Path) -> None:
    """타임라인에서 케이스를 다시 만들어 저장본과 같은지 본다."""
    script = Path(__file__).with_name("build_briefing_evaluation.py")
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp)
        for tl_dir in sorted((root / "timelines").iterdir()):
            if not tl_dir.is_dir():
                continue
            subprocess.run(
                [
                    sys.executable,
                    str(script),
                    "--timeline",
                    str(tl_dir),
                    "--out",
                    str(out),
                    "--depths",
                    *[str(d) for d in DEPTHS],
                ],
                check=True,
                capture_output=True,
            )
        for case_dir in sorted((root / "cases").iterdir()):
            if not case_dir.is_dir():
                continue
            for name in ("input.json", "golden.json"):
                rebuilt = out / case_dir.name / name
                check(rebuilt.exists(), f"{case_dir.name}/{name}: 재생성되지 않음")
                if rebuilt.exists():
                    check(
                        rebuilt.read_bytes() == (case_dir / name).read_bytes(),
                        f"{case_dir.name}/{name}: 재생성 결과가 저장본과 다름",
                    )


def check_run(root: Path, run_dir: Path) -> None:
    cases = sorted(p.name for p in (root / "cases").iterdir() if p.is_dir())
    # SUMMARY.json 같은 집계 파일은 케이스 기록이 아니다.
    runs = {p.stem: load(p) for p in run_dir.glob("*.json") if p.stem in set(cases)}
    check(set(runs) == set(cases), "실행 결과와 케이스 목록이 다름")

    versions = set()
    for name, record in sorted(runs.items()):
        check(record["error"] is None, f"{name}: 실행 오류 {record['error']}")
        versions.add(record["prompt_version"])
        output = record["filtered_output"]
        check(output is not None, f"{name}: 출력이 비어 있음")
        if output is None:
            continue
        check(len(output["highlights"]) <= 5, f"{name}: 하이라이트가 5개를 넘음")
        check(
            record["deterministic_path"] or record["recent_read_called"],
            f"{name}: 필수 도구 read_recent_reports 미호출",
        )
        check(record["dropped_highlight_count"] == 0, f"{name}: 필터로 삭제된 하이라이트 있음")
        snapshot = load(root / "cases" / name / "input.json")
        valid = {
            "report": {
                r["id"] for r in snapshot["recent_reports"] + snapshot["historical_report_context"]
            },
            "sales_deal": {d["id"] for d in snapshot["sales_deals"]},
            "document": {
                s["document_id"]
                for s in (snapshot["document_context"] or {}).get("summaries") or []
            },
            "activity": {snapshot["approved_next_meeting"]["activity_id"]},
        }
        for highlight in output["highlights"]:
            check(bool(highlight["source_refs"]), f"{name}: 근거 없는 하이라이트")
            for ref in highlight["source_refs"]:
                check(ref["id"] in valid[ref["type"]], f"{name}: 입력에 없는 근거 {ref['id']}")
    check(len(versions) == 1, f"실행마다 프롬프트 버전이 다름: {versions}")

    judged_dir = run_dir / "judged"
    if not judged_dir.is_dir():
        failures.append("채점 결과 폴더가 없음")
        return
    judged = {p.stem: load(p) for p in judged_dir.glob("*.json")}
    check(set(judged) == set(cases), "채점 결과와 케이스 목록이 다름")
    for name, result in sorted(judged.items()):
        total, maximum = result["score"]["total"], result["score"]["max_score"]
        check(0 <= total <= maximum, f"{name}: 점수가 범위를 벗어남 ({total}/{maximum})")
        golden = load(root / "cases" / name / "golden.json")
        check(
            maximum == golden["scoring"]["max_score"],
            f"{name}: 채점 만점이 골든과 다름",
        )
        judged_topics = {topic["topic_id"] for topic in result["judgement"]["required_topics"]}
        expected = {topic["topic_id"] for topic in golden["required_topics"]}
        check(judged_topics == expected, f"{name}: 필수 주제 판정 누락 또는 초과")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--run", type=Path, default=None)
    args = parser.parse_args()

    for tl_dir in sorted((args.root / "timelines").iterdir()):
        if tl_dir.is_dir():
            check_timeline(tl_dir)
    case_dirs = sorted(p for p in (args.root / "cases").iterdir() if p.is_dir())
    for case_dir in case_dirs:
        check_case(case_dir)
    check(
        len(case_dirs) == len(list((args.root / "timelines").iterdir())) * len(DEPTHS),
        "케이스 수가 체인 × 깊이와 다름",
    )
    check_reproducible(args.root)
    if args.run:
        check_run(args.root, args.run)

    print(f"검사 {checked}건")
    if failures:
        print(f"실패 {len(failures)}건")
        for item in failures:
            print(f"  - {item}")
        raise SystemExit(1)
    print("전부 통과")


if __name__ == "__main__":
    main()
