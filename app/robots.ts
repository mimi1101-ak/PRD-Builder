import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// 검색 로봇 안내: 공개 화면만 수집하고 API·로그인 처리·개발자 도구·각자의 프로젝트 화면은 수집하지 않는다.
// 로그인·크레딧·내 프로젝트 화면은 각 페이지에서 noindex 로 막는다 (로봇이 그 표시를 읽을 수 있게 여기서는 막지 않음).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/admin", "/p/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
