import { supabase } from './supabase';
import type { StaffRole } from './supabase';

export type AuthProfile = {
  id: string;
  phone: string;
  name: string;
  zone_id: string | null;
  address: string | null;
  birthday: string | null;
  email: string | null;
};

type EdgeResult<T> = { data: T | null; error: string | null };

async function callEdge<T>(body: Record<string, unknown>): Promise<EdgeResult<T>> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-verify`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { data: null, error: (json as { error?: string }).error ?? `Error ${res.status}` };
  return { data: json as T, error: null };
}

type RegisterResp = { profile: AuthProfile };
type LoginResp = { profile: AuthProfile; staffRoles: StaffRole[] };
type OperatorStatusResp = { hasOperatorAuth: boolean };
type VerifyResp = { verified: boolean };

export async function registerCustomer(phone: string, name: string, pin: string, zone_id?: string, address?: string): Promise<EdgeResult<RegisterResp>> {
  return callEdge<RegisterResp>({ action: 'register', phone, name, pin, zone_id, address });
}

export async function loginCustomer(phone: string, pin: string): Promise<EdgeResult<LoginResp>> {
  return callEdge<LoginResp>({ action: 'login', phone, pin });
}

export async function setupOperator(phone: string, email: string, password: string): Promise<EdgeResult<{ success: boolean }>> {
  return callEdge<{ success: boolean }>({ action: 'setup_operator', phone, email, password });
}

export async function verifyOperator(phone: string, email: string, password: string): Promise<EdgeResult<VerifyResp>> {
  return callEdge<VerifyResp>({ action: 'verify_operator', phone, email, password });
}

export async function getOperatorStatus(phone: string): Promise<EdgeResult<OperatorStatusResp>> {
  return callEdge<OperatorStatusResp>({ action: 'operator_status', phone });
}
