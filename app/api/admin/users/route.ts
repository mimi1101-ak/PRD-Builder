import { withErrors } from "@/lib/route";
import { getViewer } from "@/lib/access";
import { isAdmin } from "@/lib/admin";
import { findUsersByEmail } from "@/lib/admin-grants";
import { jsonError } from "@/lib/ndjson";

// 개발자 도구: 이메일로 사용자 찾기. 개발자가 아니면 없는 주소처럼 404.
async function handleGET(request: Request) {
  const viewer = await getViewer();
  if (!(await isAdmin(viewer.userId))) return jsonError(404, "찾을 수 없어요.");

  const email = (new URL(request.url).searchParams.get("email") ?? "").trim();
  if (!email || email.length > 320 || !email.includes("@")) {
    return jsonError(400, "이메일을 정확히 입력해 주세요.");
  }

  const users = await findUsersByEmail(email);
  return Response.json({ users });
}

export const GET = withErrors(handleGET);
