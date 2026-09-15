-- 일정추천을 고객사 단위로 통일한다. 통일 전에 딜 단위(scope_key = deal:<id>)로 만든 대기
-- 카드는 같은 고객사에 카드를 중복으로 띄우므로 만료 처리한다. 다음 트리거가 고객사 카드
-- (company:<id>)로 다시 만든다. 이미 수락·거절된 이력 행은 건드리지 않는다.

BEGIN;

UPDATE public.contract_next_meeting_suggestion
SET status_code = 'expired',
    refresh_reason = '고객사 단위 추천으로 통일되어 만료되었습니다.',
    updated_at = now()
WHERE scope_key LIKE 'deal:%'
  AND status_code = 'pending';

COMMIT;
