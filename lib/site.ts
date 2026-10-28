import type { Metadata } from "next";

// 검색엔진·공유 미리보기에 쓰는 사이트 정보.
// 대표 주소: Vercel 이 알려 주는 운영 도메인(자체 도메인을 붙이면 자동으로 바뀐다), 없으면 지금 주소, 개발 중에는 localhost.
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const SITE_URL = productionHost
  ? `https://${productionHost}`
  : process.env.NODE_ENV === "production"
    ? "https://dot-prd.vercel.app"
    : "http://localhost:3000";

export const SITE_NAME = "dot.PRD";
export const SITE_TITLE = "dot.PRD — 질문에 답하면 PRD가 완성돼요";
export const SITE_DESCRIPTION =
  "아이디어 한 줄을 넣으면 질문 5~10개로 빈 곳을 채운 뒤, 클로드 코드에 바로 넣을 수 있는 PRD·작업 단계·CLAUDE.md를 만들어 드려요.";

// 공유 미리보기(카카오톡·SNS 링크 카드) 그림. 시안은 ../design-mockup/og-image.html (A).
// 그림을 바꾸면 파일 이름도 바꾼다 (카카오톡 등은 같은 주소의 그림을 오래 기억한다).
const SHARE_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "dot.PRD — 아이디어 한 줄로 시작해서, 개발에 바로 쓰는 기획서까지.",
};

// 공유 미리보기 기본값. 화면별로 openGraph 를 정하면 통째로 바뀌므로 이 값을 펼쳐서 쓴다.
export const OPEN_GRAPH_BASE = {
  type: "website",
  locale: "ko_KR",
  siteName: SITE_NAME,
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  images: [SHARE_IMAGE],
} satisfies Metadata["openGraph"];

export const TWITTER_BASE = { card: "summary_large_image", images: [SHARE_IMAGE] } satisfies Metadata["twitter"];

// 공개 화면용: 제목·설명·대표 주소·공유 미리보기를 한 번에.
// 대표 주소(canonical)는 화면마다 달라야 해서 레이아웃이 아니라 각 화면에서 정한다.
export function publicPageMetadata({ title, description, path }: { title: string; description: string; path: string }) {
  const shareTitle = `${title} · ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...OPEN_GRAPH_BASE, title: shareTitle, description, url: path },
    twitter: { ...TWITTER_BASE, title: shareTitle, description },
  } satisfies Metadata;
}

// 로그인·개인 화면: 검색 결과에 나오지 않게
export const PRIVATE_ROBOTS = { index: false, follow: false } satisfies Metadata["robots"];
