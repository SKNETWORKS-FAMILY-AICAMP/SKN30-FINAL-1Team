"""사실표를 실제 보고서 분량으로 확장한다.

브리핑이 실제로 받는 보고서는 딜별 본문이 1,000자 안팎이고 사내 작성 가이드의
순서(미팅 목적 → 논의 내용 → 고객 요구 → 합의사항 → 후속조치)를 따른다.
평가 입력이 한두 문장이면 "긴 기록에서 중요한 것을 고르는" 난이도가 사라지고,
노이즈도 노이즈 구실을 하지 못한다.

그래서 ``reports.json`` 에 손으로 쓴 짧은 본문을 **사실표** 로 두고, 그 사실만 써서
본문을 확장한다. 정답지를 먼저 쓰고 원문을 나중에 만드는 순서라 확장 과정에서
정답이 흔들리지 않는다.

확장 결과는 같은 파일에 덮어쓰고 원래 문장은 ``seed`` 로 남긴다.

    python scripts/expand_briefing_reports.py \
        --timeline evaluation_data/briefing/v1/timelines/hanbit
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.services.llm import generate_structured

# 사실표에 있는 값이 본문에서 사라지면 정답과 원문이 어긋난다.
NUMBER = re.compile(r"\d[\d,]*\s*(?:만\s*원|원|명|대|건|일|주|개월|년|%|석|회)")
DATE = re.compile(r"20\d\d-\d\d-\d\d")

# 실제 보고서에는 없는 흔적. 평가 입력에 섞이면 제작 과정이 드러나거나 형식이 달라진다.
FORBIDDEN = {
    "제작 용어 노출": re.compile(r"사실표|입력으로|골든|평가용"),
    "회차 메타 서술": re.compile(r"회차|제목은"),
    "괄호 머리표": re.compile(r"\[[^\]]{2,8}\]"),
    "리터럴 줄바꿈": re.compile(r"\\n"),
}
CORE_DEAL_MIN = 800
NOISE_MIN = 300


class DealBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    deal_id: str
    body: str = Field(min_length=200, max_length=2400)


class ReportDraft(BaseModel):
    """미팅 한 건의 확정 보고서 본문."""

    model_config = ConfigDict(extra="forbid")

    common_body: str = Field(min_length=150, max_length=1200)
    deals: list[DealBody] = Field(default_factory=list, max_length=4)


CORE_INSTRUCTIONS = """너는 B2B 영업 담당자가 미팅 직후 작성하는 확정 보고서를 쓴다.

입력의 "확인된 내용" 은 이 미팅에서 실제로 확인된 사실이다. 거기 없는 금액·수량·날짜·
합의·승인·완료를 만들어 내지 마라. 확인되지 않은 항목은 "미확인입니다" 로 명시한다.

완성된 보고서는 영업 담당자가 직접 쓴 글이어야 한다.
- "확인된 내용", "입력", "회차", "제목" 같은 작성 재료를 가리키는 말을 본문에 쓰지 마라.
- 대괄호 머리표([미팅 목적] 등)를 쓰지 마라. 문단으로 이어 쓰고 문단 사이만 빈 줄로 나눈다.
- 문단 순서는 사내 작성 가이드를 따른다: 미팅 목적 → 논의 내용 → 고객 요구 → 합의사항 → 후속조치

- common_body: 회사 공통 맥락과 이번 미팅의 목적·참석자를 300~600자로 쓴다.
  특정 딜에만 해당하는 조건은 여기 쓰지 않는다.
- deals[].body: 딜마다 **900~1,500자** 로 쓴다. 고객이 한 말과 그 조건, 아직 정해지지 않은 것,
  후속 조치를 구분해 쓴다. 담당자·기한·완료 기준이 확인되지 않았으면
  "담당자와 기한은 미확인입니다" 처럼 없는 상태를 그대로 적는다.
- 확인된 내용의 숫자·날짜·고유명사는 표현을 바꾸지 말고 그대로 쓴다.
- 구매 확정이나 계약 체결은 확인된 내용에 있을 때만 쓴다.
- deals 에는 확인된 내용에 있는 딜만 넣는다. "진행 중인 딜" 목록은 회사 맥락 참고용이며,
  거기만 있는 딜은 이번 미팅에서 다루지 않았다는 뜻이다.

반드시 ReportDraft 스키마로만 답한다."""

NOISE_INSTRUCTIONS = """너는 B2B 영업 담당자가 미팅 직후 작성하는 확정 보고서를 쓴다.

이번 미팅은 특별한 결정이나 요청이 없었던 일상적인 방문이다. 그렇다고 한 줄로 쓰지 않는다.
실제 보고서처럼 **500~800자** 분량으로 쓰되, 다음을 지킨다. 300자보다 짧으면 안 된다.

- "확인된 내용", "입력", "회차", "제목" 같은 작성 재료를 가리키는 말을 쓰지 마라.
- 대괄호 머리표를 쓰지 말고 문단으로 이어 쓴다.

- 새로운 금액·수량·납기·계약 조건을 만들지 마라. 숫자를 쓰지 마라.
- 새로운 고객 요구나 미해결 과제를 만들지 마라.
- 기존 진행 상황을 확인했다는 서술, 일정 조율, 인사, 운영 안내처럼 판단을 바꾸지 않는
  내용만 쓴다.
- deals 는 빈 목록으로 둔다. 이번 미팅에서 딜별로 확인된 내용이 없다는 뜻이다.
  진행 중인 딜이 있다는 사실은 common_body 에서 한 문장으로만 언급한다.

반드시 ReportDraft 스키마로만 답한다."""


def required_tokens(text: str) -> set[str]:
    return set(NUMBER.findall(text)) | set(DATE.findall(text))


def build_input(timeline: dict[str, Any], report: dict[str, Any], deal_titles: dict[str, str]) -> str:
    no = report["no"]
    active = []
    for deal in timeline["deals"]:
        if deal["opened_at"] > no:
            continue
        stage = None
        for step in deal["stage_path"]:
            if step["at"] <= no:
                stage = step["stage_code"]
        active.append({"deal_id": deal["deal_id"], "title": deal["title"], "stage_code": stage})
    payload = {
        "회사": timeline["customer_company"]["name"],
        "참석자": [
            f"{c['name']} {c['department']} {c['job_title']}"
            for c in timeline["contacts"]
            if c.get("active_from", 1) <= no <= c.get("active_until", timeline["meeting_count"])
        ],
        "미팅 회차": no,
        "제목": report["title"],
        "진행 중인 딜": active,
        "확인된 내용": {
            "공통": report["seed"]["common_body"],
            "딜별": [
                {"deal_id": item["deal_id"], "title": deal_titles.get(item["deal_id"], ""),
                 "사실": item["body"]}
                for item in report["seed"]["deals"]
            ],
        },
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)


async def expand(timeline: dict[str, Any], report: dict[str, Any], deal_titles: dict[str, str]) -> dict[str, Any]:
    seed = report["seed"]
    core = report["kind"] == "core"
    wanted = required_tokens(
        seed["common_body"] + " " + " ".join(item["body"] for item in seed["deals"])
    )
    last_error = None
    for _attempt in range(3):
        draft = await generate_structured(
            instructions=CORE_INSTRUCTIONS if core else NOISE_INSTRUCTIONS,
            input_text=build_input(timeline, report, deal_titles),
            schema=ReportDraft,
            schema_name="ReportDraft",
            report_mode=True,
        )
        # 모델이 줄바꿈을 글자로 내보내는 경우가 있다. 실제 줄바꿈으로 되돌린다.
        common = draft.common_body.replace("\\n", "\n")
        bodies = [(item.deal_id, item.body.replace("\\n", "\n")) for item in draft.deals]
        text = common + " " + " ".join(body for _, body in bodies)
        missing = {token for token in wanted if token.replace(" ", "") not in text.replace(" ", "")}
        produced = {item.deal_id for item in draft.deals}
        expected = {item["deal_id"] for item in seed["deals"]}
        if missing:
            last_error = f"사실표 값 누락 {sorted(missing)}"
            continue
        if produced != expected:
            last_error = f"딜 구성 불일치 {sorted(produced)} != {sorted(expected)}"
            continue
        if not core and NUMBER.search(text):
            last_error = "노이즈 보고서에 수치가 들어감"
            continue
        leaked = [name for name, pattern in FORBIDDEN.items() if pattern.search(text)]
        if leaked:
            last_error = f"실제 보고서에 없는 흔적 {leaked}"
            continue
        if core and any(len(body) < CORE_DEAL_MIN for _, body in bodies):
            last_error = f"딜 본문이 {CORE_DEAL_MIN}자 미만"
            continue
        if not core and len(text) < NOISE_MIN:
            last_error = f"노이즈 보고서가 {NOISE_MIN}자 미만"
            continue
        return {
            "common_body": common,
            "deals": [{"deal_id": deal_id, "body": body} for deal_id, body in bodies],
        }
    raise RuntimeError(f"{report['no']}회차 확장 실패: {last_error}")


def passes(report: dict[str, Any]) -> bool:
    """확장된 본문이 기준을 통과하면 다시 만들지 않는다."""
    if "seed" not in report:
        return False
    bodies = [item["body"] for item in report.get("deals") or []]
    text = report["common_body"] + " " + " ".join(bodies)
    if any(pattern.search(text) for pattern in FORBIDDEN.values()):
        return False
    if report["kind"] == "core":
        if any(len(body) < CORE_DEAL_MIN for body in bodies):
            return False
        seed_deals = {item["deal_id"] for item in report["seed"]["deals"]}
        if seed_deals != {item["deal_id"] for item in report.get("deals") or []}:
            return False
        seed_text = report["seed"]["common_body"] + " " + " ".join(
            item["body"] for item in report["seed"]["deals"]
        )
        return all(
            token.replace(" ", "") in text.replace(" ", "")
            for token in required_tokens(seed_text)
        )
    return len(text) >= NOISE_MIN and not bodies and not NUMBER.search(text)


async def main_async(args: argparse.Namespace) -> None:
    tl_path = args.timeline / "timeline.json"
    rp_path = args.timeline / "reports.json"
    timeline = json.loads(tl_path.read_text(encoding="utf-8"))
    payload = json.loads(rp_path.read_text(encoding="utf-8"))
    deal_titles = {deal["deal_id"]: deal["title"] for deal in timeline["deals"]}

    # 노이즈도 실제 분량이어야 노이즈 구실을 한다. 빌더가 채우던 자리를 여기서 실체화한다.
    by_no = {report["no"]: report for report in payload["reports"]}
    noise_topics = timeline.get("noise_topics") or ["정기 방문"]
    reports = []
    for no in range(1, timeline["meeting_count"] + 1):
        if no in by_no:
            reports.append(by_no[no])
            continue
        label = noise_topics[(no - 1) % len(noise_topics)]
        reports.append({
            "no": no, "kind": "noise", "title": label,
            "common_body": f"{label}. 진행 상황만 공유했고 새로 결정되거나 요청된 사항은 없습니다.",
            "deals": [],
        })

    for report in reports:
        if "seed" not in report:
            report["seed"] = {
                "common_body": report["common_body"],
                "deals": report.get("deals") or [],
            }
    payload["reports"] = reports
    payload["note"] = (
        "seed 는 사람이 쓴 사실표이고 common_body·deals 는 그 사실만으로 확장한 본문이다. "
        "kind=core 는 주제를 열거나 닫고, kind=noise 는 하이라이트로 올리면 감점되는 일상 기록이다."
    )

    def save() -> None:
        rp_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

    failed = []
    for report in reports:
        label = f"{timeline['timeline_id']}-{report['no']:02d}"
        if args.only and report["no"] not in args.only:
            continue
        if not args.force and passes(report):
            continue
        try:
            expanded = await expand(timeline, report, deal_titles)
        except RuntimeError as exc:
            failed.append(label)
            print(f"{label} [{report['kind']}] 실패: {exc}")
            continue
        report["common_body"] = expanded["common_body"]
        report["deals"] = expanded["deals"]
        # 한 건마다 저장한다. 중간에 멈춰도 앞선 결과가 남는다.
        save()
        total = len(expanded["common_body"]) + sum(len(d["body"]) for d in expanded["deals"])
        print(f"{label} [{report['kind']}] {total}자")
    save()
    if failed:
        raise SystemExit(f"확장 실패 {len(failed)}건: {failed}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--timeline", required=True, type=Path)
    parser.add_argument("--only", nargs="*", type=int, default=None)
    parser.add_argument("--force", action="store_true", help="기준을 통과한 보고서도 다시 만든다")
    asyncio.run(main_async(parser.parse_args()))


if __name__ == "__main__":
    main()
