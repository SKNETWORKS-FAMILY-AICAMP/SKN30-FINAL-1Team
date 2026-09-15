BEGIN;

ALTER TABLE public.contract_next_meeting_suggestion
    ADD COLUMN IF NOT EXISTS scope_key text,
    ADD COLUMN IF NOT EXISTS customer_company_id uuid REFERENCES public.customer_company (id),
    ADD COLUMN IF NOT EXISTS customer_contact_id uuid REFERENCES public.customer_contact (id),
    ADD COLUMN IF NOT EXISTS owner_member_id uuid REFERENCES public.member (id),
    ADD COLUMN IF NOT EXISTS source_report_id uuid REFERENCES public.report (id),
    ADD COLUMN IF NOT EXISTS source_activity_id uuid REFERENCES public.activity (id);

UPDATE public.contract_next_meeting_suggestion suggestion
SET scope_key = 'deal:' || suggestion.sales_deal_id::text,
    customer_company_id = deal.customer_company_id,
    customer_contact_id = deal.customer_contact_id,
    owner_member_id = deal.owner_member_id
FROM public.sales_deal deal
WHERE deal.id = suggestion.sales_deal_id
  AND (suggestion.scope_key IS NULL
       OR suggestion.customer_company_id IS NULL
       OR suggestion.owner_member_id IS NULL);

ALTER TABLE public.contract_next_meeting_suggestion
    ALTER COLUMN sales_deal_id DROP NOT NULL,
    ALTER COLUMN scope_key SET NOT NULL,
    ALTER COLUMN customer_company_id SET NOT NULL,
    ALTER COLUMN owner_member_id SET NOT NULL;

ALTER TABLE public.contract_next_meeting_suggestion
    DROP CONSTRAINT IF EXISTS contract_next_meeting_suggestion_sales_deal_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS contract_next_meeting_suggestion_scope_key_key
    ON public.contract_next_meeting_suggestion (scope_key);

CREATE INDEX IF NOT EXISTS contract_next_meeting_suggestion_company_idx
    ON public.contract_next_meeting_suggestion (team_id, customer_company_id);

COMMENT ON COLUMN public.contract_next_meeting_suggestion.scope_key IS
    '현재 추천을 교체하는 범위. deal:<id> 또는 company:<id>.';
COMMENT ON COLUMN public.contract_next_meeting_suggestion.source_report_id IS
    '보고서 작성·수정 제출로 생성된 고객사 추천의 최신 제출 보고서.';

COMMIT;
