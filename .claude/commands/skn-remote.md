---
description: SKN org 저장소(SKN30-FINAL-1Team) main 브랜치에 현재 develop을 동기화
allowed-tools: Bash(git remote:*), Bash(git fetch:*), Bash(git push:*), Bash(git rev-parse:*), Bash(git log:*)
---

# SKN org 저장소 동기화

`origin/develop`을 `SKNETWORKS-FAMILY-AICAMP/SKN30-FINAL-1Team`의 `main` 브랜치에 push 한다.

## 절차

### 1. org 리모트 확인

`org` 리모트가 없으면 추가하고, 있으면 URL이 기대 저장소와 일치하는지 검증한다.
다르면 `set-url`로 바로잡은 뒤 진행한다 (잘못된 저장소로 push 하는 사고 방지).

```bash
EXPECTED="https://github.com/SKNETWORKS-FAMILY-AICAMP/SKN30-FINAL-1Team.git"
if git remote get-url org >/dev/null 2>&1; then
  [ "$(git remote get-url org)" = "$EXPECTED" ] || git remote set-url org "$EXPECTED"
else
  git remote add org "$EXPECTED"
fi
git remote -v   # org URL 최종 확인
```

`git remote -v` 출력에서 `org`가 위 URL을 가리키는지 **눈으로 확인한 뒤** 다음 단계로 넘어간다.

### 2. 최신 develop 가져오기

```bash
git fetch origin
```

### 3. org main으로 push

```bash
git push org origin/develop:main
```

### 4. 결과 보고

- **성공 시**: `SKNETWORKS-FAMILY-AICAMP/SKN30-FINAL-1Team` main 업데이트 완료를 알린다.
  어떤 커밋까지 올라갔는지 함께 보고한다 (`git log -1 --oneline origin/develop`).
- **실패 시**: 에러 메시지를 **그대로** 보고하고 **중단한다.**

## 규칙

- 항상 `origin/develop` 기준으로 push 한다. 로컬 브랜치 상태는 쓰지 않는다.
- **force push 절대 금지.** `--force`, `--force-with-lease`, `+` 접두사 모두 사용하지 않는다.
- push 전에 별도의 커밋·머지·리베이스를 하지 않는다. **이미 `develop`에 반영된 것만** 올린다.
- 실패하면 자동으로 해결하려 시도하지 않는다. 원인을 추측해 명령을 바꿔 재시도하는 것도 금지.
  에러를 보고하고 사용자의 판단을 기다린다.
