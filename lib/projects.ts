import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PRD_PREVIEW_SECTIONS,
  toChatMessage,
  type DocKind,
  type DocumentRow,
  type MessageRow,
  type ProjectRow,
} from "@/lib/domain";
import { splitPrdPreview } from "@/lib/markdown";

export async function loadMessages(projectId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("messages")
    .select("*")
    .eq("project_id", projectId)
    .order("id", { ascending: true });
  if (error) throw error;
  return (data as MessageRow[]).map(toChatMessage);
}

export async function loadDocuments(projectId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("documents").select("*").eq("project_id", projectId);
  if (error) throw error;
  const docs: Partial<Record<DocKind, DocumentRow>> = {};
  for (const row of data as DocumentRow[]) docs[row.kind] = row;
  return docs;
}

export async function loadCredits(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("credits").eq("id", userId).maybeSingle();
  return (data?.credits as number | undefined) ?? 0;
}

export type DocState = {
  kind: DocKind;
  status: DocumentRow["status"];
  content: string;
  rewriteCount: number;
  updatedAt: string;
  // PRD 를 잠금 해제 전에 보낼 때만: 잠긴 장의 제목 ("4. 사용자 흐름" …). 내용은 보내지 않는다.
  lockedTitles?: string[];
};

// 잠금 해제했거나 미리보기 전에 받은 PRD 면 전체를 본다
export function prdOpen(project: Pick<ProjectRow, "unlocked" | "prd_free">) {
  return project.unlocked || project.prd_free;
}

// 결제 전 PRD 는 앞 장만 브라우저로 보낸다
export function toPrdState(row: DocumentRow | undefined, open: boolean): DocState | null {
  const state = toDocState(row);
  if (!state || open) return state;
  const { preview, lockedTitles } = splitPrdPreview(state.content, PRD_PREVIEW_SECTIONS);
  return { ...state, content: preview, lockedTitles };
}

export function toDocState(row: DocumentRow | undefined): DocState | null {
  if (!row) return null;
  return {
    kind: row.kind,
    status: row.status,
    content: row.content,
    rewriteCount: row.rewrite_count,
    updatedAt: row.updated_at,
  };
}
