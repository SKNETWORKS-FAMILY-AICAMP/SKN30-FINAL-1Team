# SalesLuv 평가 증빙

발표 수치의 원본 데이터셋과 결과 파일입니다.
두 평가 모두 실제 고객 데이터를 쓰지 않았습니다 (합성 데이터 / 공개 익명화 데이터).

## 01 보고서작성 에이전트

- `데이터셋/salesluv-report-eval-v1/`
  - `cases/` — 평가 케이스 53건. 각 폴더에 작성기 입력(`input.json`)과 채점용 정답지(`golden.json`)
  - `transcripts/` — 미팅 원문 36건
  - `judge.md` — 채점 기준 / `seed.json` — 사람이 검수한 원천 사실표
- `결과/AB_A-vs-B_COMPARISON.json` — 발표의 품질 점수·토큰·승패 원본
- `결과/BC_B-vs-C_결과.md` — C 구조 비교 결과와 월간 생성 실패 기록

## 02 딜 승산 예측 모델

- 데이터셋: Salvirt B2B Sales Dataset (공개) 448행 × 22개 입력 + 정답, Won 227 : Lost 221
  - https://www.salvirt.com/research/b2bdataset
  - 실제 사용 배포본: https://huggingface.co/datasets/markobo/B2B_Sales_data/resolve/c3bae20f010d8ec74f6e9f85ef19368811dd15d3/Salvirt_B2B_ML_dataset_HF.csv
- `결과/머신러닝_딥러닝_학습결과서.pdf` — 전처리·평가 설계·후보 7종 비교·최종 선정
- `결과/학습한_ML_DL_모델_산출물.pdf` — 최종 모델 명세와 성능

모델 파일(`deal-paper-rf-ensemble-v1.joblib`, 16MB, 30회 평가 결과 내장)은
`FINAL-report-writing/backend/pipeline/artifacts/`에 있습니다.
