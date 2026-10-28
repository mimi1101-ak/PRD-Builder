// 사업자 정보. 사업자등록증과 글자 하나까지 같아야 한다 (결제 심사). 푸터·이용약관·개인정보처리방침에서 쓴다.
// 빈 값은 화면에 나오지 않는다.
export const BUSINESS = {
  name: "미야 스튜디오 (MIYA STUDIO)",
  owner: "양준영",
  registrationNo: "308-10-69260",
  mailOrderNo: "", // 통신판매업 신고번호: 신고 후 채운다
  address: "충청북도 청주시 청원구 수암로88번길 13, 201호(우암동)",
  phone: "010-3743-8751",
  email: "heeyoung1101yang@naver.com",
  hosting: "Vercel Inc.", // 호스팅 제공자 (전자상거래법 시행령 표시 항목)
} as const;

export const BUSINESS_FIELDS: { label: string; value: string }[] = [
  { label: "상호", value: BUSINESS.name },
  { label: "대표자", value: BUSINESS.owner },
  { label: "사업자등록번호", value: BUSINESS.registrationNo },
  { label: "통신판매업 신고번호", value: BUSINESS.mailOrderNo },
  { label: "주소", value: BUSINESS.address },
  { label: "전화", value: BUSINESS.phone },
  { label: "이메일", value: BUSINESS.email },
  { label: "호스팅 제공자", value: BUSINESS.hosting },
].filter((f) => f.value);
