import { z } from "zod";
import { withErrors } from "@/lib/route";
import { ensureGuestToken, getViewer } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/ndjson";
import { EXPERIENCES, MAX_INPUT_LENGTH, TOOLS, emptyCoverage, emptySummary } from "@/lib/domain";

const CreateSchema = z.object({
  idea: z.string().trim().min(1).max(MAX_INPUT_LENGTH),
  tool: z.enum(TOOLS.map((t) => t.value) as [string, ...string[]]).default("claude_code"),
  experience: z
    .enum(EXPERIENCES.map((e) => e.value) as [string, ...string[]])
    .nullable()
    .optional(),
});

const CREATE_LIMIT_PER_10_MIN = 10;

// 아이디어 한 줄 → 프로젝트 생성. 로그인 없이도 된다 (PRD F1).
async function handlePOST(request: Request) {
  const parsed = CreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(400, `아이디어를 1~${MAX_INPUT_LENGTH}자로 입력해 주세요.`);
  }
  const { idea, tool, experience } = parsed.data;

  const viewer = await getViewer();
  const owner = viewer.userId
    ? { user_id: viewer.userId, guest_token: null }
    : { user_id: null, guest_token: await ensureGuestToken(viewer) };

  const admin = createAdminClient();

  // 남용 방지: 10분에 10개까지
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  let recent = admin.from("projects").select("id", { count: "exact", head: true }).gte("created_at", since);
  recent = owner.user_id ? recent.eq("user_id", owner.user_id) : recent.eq("guest_token", owner.guest_token!);
  const { count } = await recent;
  if ((count ?? 0) >= CREATE_LIMIT_PER_10_MIN) {
    return jsonError(429, "새 아이디어를 너무 많이 만들었어요. 잠시 후 다시 시도해 주세요.", "rate_limited");
  }

  const { data: project, error } = await admin
    .from("projects")
    .insert({
      ...owner,
      idea,
      tool,
      experience: experience ?? null,
      title: idea.slice(0, 40),
      coverage: emptyCoverage(),
      summary: emptySummary(),
    })
    .select("id")
    .single();
  if (error || !project) {
    console.error("[projects] insert failed", error);
    return jsonError(500, "프로젝트를 만들지 못했어요. 다시 시도해 주세요.");
  }

  // 첫 메시지 = 아이디어. 채팅 화면이 열리면 AI 가 여기에 답한다.
  const { error: msgError } = await admin
    .from("messages")
    .insert({ project_id: project.id, role: "user", content: idea, phase: "interview" });
  if (msgError) {
    console.error("[projects] first message failed", msgError);
    await admin.from("projects").delete().eq("id", project.id);
    return jsonError(500, "프로젝트를 만들지 못했어요. 다시 시도해 주세요.");
  }

  return Response.json({ id: project.id });
}

export const POST = withErrors(handlePOST);
