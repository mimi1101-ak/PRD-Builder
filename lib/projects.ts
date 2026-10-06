import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { toChatMessage, type DocKind, type DocumentRow, type MessageRow } from "@/lib/domain";

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
};

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
