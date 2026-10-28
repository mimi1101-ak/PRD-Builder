import type { NextConfig } from "next";

// 모든 응답에 붙이는 보안 헤더 (HTTPS 강제(HSTS)는 Vercel 이 붙인다)
const SECURITY_HEADERS = [
  // 다른 사이트가 우리 화면을 투명한 액자(iframe)로 겹쳐 버튼을 누르게 하는 것(클릭재킹)을 막는다
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  // 브라우저가 파일 종류를 멋대로 추측해 스크립트로 실행하지 않게
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 다른 사이트로 갈 때 주소 전체(프로젝트 id 등)를 넘기지 않고 사이트 주소만 넘긴다
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 쓰지 않는 카메라·마이크·위치 권한은 아예 끈다
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  // lib/prompts/*.md 는 서버에서 파일로 읽으므로 배포 번들에 꼭 포함시킨다.
  outputFileTracingIncludes: {
    "/api/**/*": ["./lib/prompts/**/*.md"],
  },
  // 응답에 "Next.js 로 만든 사이트"라고 알리지 않는다
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
