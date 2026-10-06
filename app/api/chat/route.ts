import { z } from "zod";
import { withErrors } from "@/lib/route";
import { getProjectForViewer, getViewer } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, ndjsonResponse } from "@/lib/ndjson";
import { runInterviewTurn, type TurnResult } from "@/lib/ai/interview";
import { describeAiError } from "@/lib/ai/client";
import { loadMessages } from "@/lib/projects";
import {
  MAX_INPUT_LENGTH,
  MAX_MESSAGES_PER_PROJECT,
  MESSAGES_PER_MINUTE,
  countQuestions,
  normalizeCoverage,
  normalizeSummary,
  toChatMessage,
  toProjectView,
  type MessageRow,
} from "@/lib/domain";

export const maxDuration = 60;

const ChatSchema = z.object({
  projectId: z.string(),
  // 없으면 "마지막 사용자 메시지에 다시 답하기"(재시도·이어하기)
  message: z.string().trim().min(1).max(MAX_INPUT_LENGTH).optional(),
});

// 대화 기록과 프로젝트 상태를 다시 불러오기 (이어하기·동기화용)
async function handleGET(request: Request) {
  const projectId = new URL(request.url).searchParams.get("projectId") ?? "";
  const viewer = await getViewer();
  const project = await getProjectForViewer(projectId, viewer);
  if (!project) return jsonError(404, "프로젝트를 찾을 수 없어요.");
  const messages = await loadMessages(project.id);
  return Response.json({ project: toProjectView(project), messages });
}

// 대화 응답 만들기 (PRD 7장 ①): 요약 + 질문 1개를 스트리밍하고, 끝나면 요약·영역 상태·추천 답변을 보낸다.
async function handlePOST(request: Request) {
  const parsed = ChatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, `메시지는 1~${MAX_INPUT_LENGTH}자로 입력해 주세요.`);
  const { projectId, message } = parsed.data;

  const viewer = await getViewer();
  const project = await getProjectForViewer(projectId, viewer);
  if (!project) return jsonError(404, "프로젝트를 찾을 수 없어요.");
  if (project.status === "done") {
    return jsonError(409, "이미 문서를 만든 프로젝트예요. 결과 화면에서 확인해 주세요.", "done");
  }

  const admin = createAdminClient();

  // 분당 요청 제한 (PRD 9장 비용)
  const { data: recentCount } = await admin.rpc("count_recent_messages", {
    p_user_id: project.user_id,
    p_guest_token: project.user_id ? null : project.guest_token,
    p_seconds: 60,
  });
  if ((recentCount ?? 0) >= MESSAGES_PER_MINUTE) {
    return jsonError(429, "조금 천천히 진행해 주세요. 1분 뒤에 다시 시도할 수 있어요.", "rate_limited");
  }

  const history = await loadMessages(project.id);
  if (history.length >= MAX_MESSAGES_PER_PROJECT) {
    return jsonError(409, "대화가 너무 길어졌어요. 지금 내용으로 PRD를 만들어 주세요.", "too_long");
  }
  const last = history[history.length - 1];
  const phase = project.status === "final_check" ? "final_check" : "interview";

  if (message) {
    if (last?.role === "user") {
      return jsonError(409, "이전 답변을 아직 처리 중이에요. '다시 시도'를 눌러 주세요.", "pending");
    }
    const { data: saved, error } = await admin
      .from("messages")
      .insert({ project_id: project.id, role: "user", content: message, phase })
      .select("*")
      .single();
    if (error || !saved) return jsonError(500, "메시지를 저장하지 못했어요. 다시 시도해 주세요.");
    history.push(toChatMessage(saved as MessageRow));
  } else if (last?.role !== "user") {
    return jsonError(409, "답할 메시지가 없어요.", "nothing_to_answer");
  }

  const lastUser = history[history.length - 1];
  const view = toProjectView(project);

  return ndjsonResponse(async (send) => {
    if (message) send({ type: "user_saved", message: lastUser });

    let result: TurnResult;
    try {
      result = await runInterviewTurn(
        {
          tool: project.tool,
          experience: project.experience,
          status: project.status,
          questionCount: countQuestions(history),
          coverage: normalizeCoverage(project.coverage),
          summary: normalizeSummary(project.summary),
          history,
        },
        (delta) => send({ type: "text", delta }),
        request.signal,
      );
    } catch (err) {
      // 사용자가 창을 닫음 → 저장하지 않고, 다음 접속 때 다시 답한다
      if (request.signal.aborted) return;
      console.error("[chat] AI failed", err);
      const { message: errorMessage, retryable } = describeAiError(err);
      send({ type: "error", message: errorMessage, retryable });
      return;
    }

    // 다른 창에서 이미 답이 저장됐다면 중복 저장하지 않는다.
    const { data: newer } = await admin
      .from("messages")
      .select("id")
      .eq("project_id", project.id)
      .gt("id", lastUser.id)
      .limit(1);
    if (newer && newer.length > 0) {
      send({
        type: "error",
        message: "다른 창에서 이미 답했어요. 새로고침해 주세요.",
        retryable: false,
        code: "stale",
      });
      return;
    }

    const { data: aiRow, error: aiError } = await admin
      .from("messages")
      .insert({
        project_id: project.id,
        role: "ai",
        content: result.text,
        options: result.options,
        phase: result.phase,
      })
      .select("*")
      .single();
    if (aiError || !aiRow) {
      send({ type: "error", message: "답변을 저장하지 못했어요. 다시 시도해 주세요.", retryable: true });
      return;
    }

    const status = result.phase === "final_check" ? "final_check" : "interviewing";
    const title = result.summary.title || view.title;
    const { error: updateError } = await admin
      .from("projects")
      .update({
        status,
        coverage: result.coverage,
        summary: result.summary,
        title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id);
    if (updateError) console.error("[chat] project update failed", updateError);

    send({
      type: "done",
      message: toChatMessage(aiRow as MessageRow),
      project: { ...view, status, title, coverage: result.coverage, summary: result.summary },
    });
  });
}

export const GET = withErrors(handleGET);
export const POST = withErrors(handlePOST);
