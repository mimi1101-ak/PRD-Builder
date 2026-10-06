import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lib/prompts/*.md 는 서버에서 파일로 읽으므로 배포 번들에 꼭 포함시킨다.
  outputFileTracingIncludes: {
    "/api/**/*": ["./lib/prompts/**/*.md"],
  },
};

export default nextConfig;
