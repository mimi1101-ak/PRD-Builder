import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 개발자 도구 화면과 API 가 함께 쓰는 형태

export type AdminUser = {
  id: string;
  email: string;
  nickname: string | null;
  credits: number;
  provider: string | null;
  createdAt: string;
  projectCount: number;
};

export type AdminGrant = {
  id: string;
  email: string | null;
  nickname: string | null;
  amount: number;
  memo: string | null;
  createdAt: string;
};

type GrantRow = {
  id: string;
  email: string | null;
  nickname: string | null;
  amount: number;
  memo: string | null;
  created_at: string;
};

type UserRow = {
  id: string;
  email: string;
  nickname: string | null;
  credits: number;
  provider: string | null;
  created_at: string;
  project_count: number;
};

export async function findUsersByEmail(email: string): Promise<AdminUser[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("admin_find_user", { p_email: email });
  if (error) throw error;
  return ((data ?? []) as UserRow[]).map((u) => ({
    id: u.id,
    email: u.email,
    nickname: u.nickname,
    credits: u.credits,
    provider: u.provider,
    createdAt: u.created_at,
    projectCount: u.project_count,
  }));
}

export async function loadRecentGrants(limit = 20): Promise<AdminGrant[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("admin_recent_grants", { p_limit: limit });
  if (error) throw error;
  return ((data ?? []) as GrantRow[]).map((g) => ({
    id: g.id,
    email: g.email,
    nickname: g.nickname,
    amount: g.amount,
    memo: g.memo,
    createdAt: g.created_at,
  }));
}
