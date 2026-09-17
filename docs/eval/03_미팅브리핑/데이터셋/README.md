# 미팅 브리핑 평가셋 v1

계약관리 Agent 가 만드는 **미팅 브리핑** 의 품질을 평가한다.
참고자료(계약서·견적서·제품설명서) 자체의 품질은 자료요약 Agent 평가에서 다루고,
여기서는 주어진 자료와 보고서를 브리핑이 어떻게 쓰는지만 본다.

## 무엇을 평가하나

브리핑 출력은 두 필드뿐이다.

```
highlights[0..5]  title · body · suggested_actions · source_refs · related_deal_ids
missing_information[0..20]
```

## 평가 축은 누적 깊이

보고서 평가가 미팅·일일·주간·월간이라면, 브리핑은 **몇 회차 미팅인가** 가 난이도를 만든다.
브리핑이 한 번에 읽는 보고서는 최신 3건뿐이고, 그 너머는 RAG 로만 닿기 때문이다.

| 깊이 | 상태 | 시험되는 것 |
|---|---|---|
| d01 | 보고서 0건 | `first_meeting`. **LLM 을 타지 않고 고정 문구를 반환한다** |
| d03 | 창과 일치 | RAG 를 억지로 부르지 않기 |
| d05 | 창 밖 1건 | 막 밀려난 미해결 이슈를 RAG 로 회수 |
| d10 | 창 밖 6건 | 상태 추적 + 우선순위 |
| d30 | 창 밖 26건 | 노이즈를 뚫고 5개 고르기 |

## 체인 6개

타임라인 하나(보고서 30건)를 다섯 시점으로 잘라 케이스 5개를 만든다. 6 × 5 = 30 케이스.

| 체인 | 회사 | 성격 |
|---|---|---|
| hanbit | 한빛병원 | 표준. 딜 4건이 서로 다른 속도로 진행하고 끝에 다 끝나지 않는다 |
| sejong | 세종의료재단 | **딜이 하나도 없다.** 비어 있는 것이 정상이며 누락으로 쓰면 안 된다 |
| daeyang | 대양산업 | 문서 중심. **보고서 60석 ↔ 견적서 80석** 충돌을 짚어야 한다 |
| miraero | 미래로병원 | 수량·납기·담당자가 여러 번 바뀐다. 옛 값을 현재처럼 쓰면 안 된다 |
| hanul | 한울제약 | 30건 중 핵심이 2건뿐. 노이즈 판별만 본다 |
| cheongsan | 청산네트웍스 | 딜이 모두 종결됐다. **억지로 5개를 채우면 안 된다** |

## 폴더

```
timelines/<체인>/
  timeline.json   회사·담당자(재직 구간)·딜 stage_path·주제 타임라인·문서
  reports.json    30회차 전부. seed(사실표) + 실제 분량으로 확장한 본문
cases/<체인>-d<깊이>/
  input.json      generate_briefing(snapshot) 에 그대로 넣는 스냅샷
  golden.json     그 시점의 주제 상태에서 계산된 정답
```

## 골든은 손으로 쓰지 않는다

체인마다 **주제 타임라인 하나**만 설계하면 슬라이스별 골든이 계산된다.
`opened_at` / `resolved_at` / `changed` 세 값에서 t 시점의 상태가 결정된다.

```
t < opened_at              아직 없음
opened_at ≤ t < resolved_at  required_topics (창 밖이면 requires_rag)
resolved_at ≤ t            must_not_appear (다시 올리면 감점)
changed.at ≤ t             changed_values (최신 값만 써야 함)
```

## 보고서 본문

브리핑이 실제로 받는 확정 보고서와 같은 분량·구조로 만든다. 입력이 한두 문장이면
"긴 기록에서 중요한 것을 고르는" 난이도가 사라지기 때문이다.

| | 기준 |
|---|---|
| 핵심 보고서 딜 본문 | 800자 이상, 작성 가이드 순서(미팅 목적 → 논의 → 고객 요구 → 합의 → 후속조치) |
| 일상 기록 | 300자 이상, 결정·요청·수치 없음, 딜별 본문 없음 |
| 사실표 보존 | seed 의 금액·수량·날짜가 본문에 그대로 남아야 함 |
| 금지 흔적 | 제작 용어(사실표 등), 회차·제목 메타 서술, 괄호 머리표, 리터럴 줄바꿈 |

`seed` 를 먼저 쓰고 본문을 나중에 확장한다. 정답이 본문 생성에 흔들리지 않게 하는 순서다.

## 채점

```
highlight_selection  25   코드 계산 — 주제별 판정에서 커버리지와 낭비를 집계
state_tracking       15   코드 계산 — 해결된 사안 재등장, 옛 값 사용
factual_accuracy     20   LLM 판단
suggested_actions    20   LLM 판단
scannability         10   LLM 판단
missing_information  10   LLM 판단
```

상태 변화가 없는 슬라이스(d01·d03)에서는 `state_tracking` 을 빼고 **85점 만점** 으로 환산한다.

**산술은 LLM 에 맡기지 않는다.** 첫 실행에서 Judge 가 어떤 주제를 스스로 `partial` 이라
판정하고도 하이라이트 선택에 만점을 준 일이 있었다. 지금은 주제별 판정만 LLM 이 하고
점수는 코드가 계산한다.

## 실행

```bash
# 타임라인 → 케이스
python scripts/build_briefing_evaluation.py \
    --timeline evaluation_data/briefing/v1/timelines/hanbit \
    --out evaluation_data/briefing/v1/cases --depths 1 3 5 10 30

# 실제 브리핑 생성 (DB·API 없이 도구는 실제로 호출된다)
python scripts/run_briefing_evaluation.py \
    --cases evaluation_data/briefing/v1/cases \
    --out evaluation_results/briefing/run-001

# 채점
python scripts/judge_briefing.py \
    --cases evaluation_data/briefing/v1/cases \
    --run evaluation_results/briefing/run-001 \
    --out evaluation_results/briefing/run-001/judged
```

`.env` 가 있는 디렉터리에서 실행해야 LLM 설정이 잡힌다.

## 하네스가 하는 일

* `_report_scope` 를 넣지 않은 스냅샷을 쓰되, 보고서 재조회 경로는 스냅샷에서 받아 준다.
  도구는 실제로 호출되면서 값만 고정되므로 재현이 된다.
* `_validate_briefing_output` 은 근거 없는 하이라이트를 **조용히 버린다.** 그래서 필터 전
  출력을 따로 잡는다. 그러지 않으면 "모델이 안 만든 것" 과 "필터가 지운 것" 을 구분할 수 없다.
* 첫 미팅은 LLM 을 타지 않고 조기 return 하므로 반환값을 그대로 기록한다.

## 실제 고객 데이터 없음

모든 회사·담당자·보고서·문서는 평가용으로 만든 합성 데이터다.
