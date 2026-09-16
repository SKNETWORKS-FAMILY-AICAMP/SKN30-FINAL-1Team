-- 상품 분류를 고르는 대신 직접 적게 한다. 세 코드(system/probe/consumable)만 받던 제약을
-- 공백이 아닌 254자 이하 문자열로 넓힌다. 기존 행의 코드는 그대로 두고 화면이 이름으로 바꿔 보인다.

BEGIN;

ALTER TABLE public.product
    DROP CONSTRAINT product_category_code_check,
    ADD CONSTRAINT product_category_code_check CHECK (
        length(btrim(category_code)) BETWEEN 1 AND 254
    );

COMMENT ON COLUMN public.product.category_code IS
    '제품 분류. 자유 입력이다. 예전 행의 system / probe / consumable 은 화면이 시스템 / 프로브 / 소모품으로 보인다.';

COMMIT;
