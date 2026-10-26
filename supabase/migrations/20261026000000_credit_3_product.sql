-- 크레딧 3건(9,900원) 상품 추가 (2026-10-26). 결제 기록의 상품 종류에 credit_3 을 허용한다.

alter table public.payments drop constraint if exists payments_product_check;
alter table public.payments
  add constraint payments_product_check check (product in ('credit_1', 'credit_3', 'credit_5'));
