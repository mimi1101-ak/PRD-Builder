import { z } from "zod";
import { withErrors } from "@/lib/route";
import { getProjectForViewer, getViewer } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, ndjsonResponse } from "@/lib/ndjson";
import { rewriteSection } from "@/lib/ai/documents";
import { describeAiError } from "@/lib/ai/client";
import { getSection, replaceSection } from "@/lib/markdown";
import { loadDocuments, loadMessages } from "@/lib/projects";
import { REWRITES_PER_CREDIT, normalizeCoverage, normalizeSummary } from "@/lib/domain";

export const maxDuration = 120;

const RewriteSchema = z.object({
  projectId: z.string(),
  kind: z.enum(["prd", "tasks", "claude_md"]),
  heading: z.string().min(3).max(300),
  instruction: z.string().max(500).default(""),
});

// 섹션 단위 다시 쓰기: 잠금 해제된 프로젝트에서 크레딧 1건당 3회까지 (PRD F2)
async function handlePOST(request: Request) {
  const parsed = RewriteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "잘못된 요청이에요.");
  const { projectId, kind, heading, instruction } = parsed.data;

  const viewer = await getViewer();
  if (!viewer.userId) return jsonError(401, "로그인이 필요해요.", "login_required");
  const project = await getProjectForViewer(projectId, viewer);
  if (!project) return jsonError(404, "프로젝트를 찾을 수 없어요.");
  if (!project.unlocked)
    return jsonError(402, "다시 쓰기는 크레딧으로 잠금 해제한 프로젝트에서 쓸 수 있어요.", "locked");

  const docs = await loadDocuments(project.id);
  const used = Object.values(docs).reduce((sum, d) => sum + (d?.rewrite_count ?? 0), 0);
  if (used >= REWRITES_PER_CREDIT) {
    return jsonError(429, `다시 쓰기는 프로젝트당 ${REWRITES_PER_CREDIT}번까지예요.`, "rewrite_limit");
  }

  const doc = docs[kind];
  if (!doc || doc.status !== "ready" || !doc.content) return jsonError(409, "문서가 아직 없어요.");
  const section = getSection(doc.content, heading);
  if (!section) return jsonError(400, "다시 쓸 섹션을 찾지 못했어요. 새로고침 후 다시 시도해 주세요.");

  const messages = await loadMessages(project.id);
  const admin = createAdminClient();

  return ndjsonResponse(async (send) => {
    let rewritten: string;
    try {
      rewritten = await rewriteSection(
        kind,
        {
          idea: project.idea,
          tool: project.tool,
          experience: project.experience,
          coverage: normalizeCoverage(project.coverage),
          summary: normalizeSummary(project.summary),
          messages,
          document: doc.content,
          section,
          heading,
          instruction,
        },
        (delta) => send({ type: "text", delta }),
      );
    } catch (err) {
      console.error("[rewrite] failed", err);
      const { message, retryable } = describeAiError(err);
      send({ type: "error", message, retryable });
      return;
    }

    // 제목 줄은 원래 것으로 고정 (화면의 섹션 위치가 바뀌지 않게)
    const lines = rewritten.trim().split("\n");
    if (/^#{1,6}\s/.test(lines[0])) lines[0] = heading;
    else lines.unshift(heading);
    const newSection = lines.join("\n");

    const newContent = replaceSection(doc.content, heading, newSection);
    if (!newContent) {
      send({ type: "error", message: "섹션을 바꿔 끼우지 못했어요.", retryable: false });
      return;
    }

    const { data: applied, error } = await admin.rpc("apply_rewrite", {
      p_project_id: project.id,
      p_kind: kind,
      p_content: newContent,
      p_limit: REWRITES_PER_CREDIT,
    });
    if (error || !applied) {
      send({ type: "error", message: `다시 쓰기는 프로젝트당 ${REWRITES_PER_CREDIT}번까지예요.`, retryable: false });
      return;
    }

    send({
      type: "done",
      document: { kind, status: "ready", content: newContent, rewriteCount: doc.rewrite_count + 1 },
      section: newSection,
      rewritesLeft: Math.max(0, REWRITES_PER_CREDIT - used - 1),
    });
  });
}

export const POST = withErrors(handlePOST);
