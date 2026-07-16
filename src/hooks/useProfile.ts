import { useCallback, useState, useEffect } from 'react';
import { DELIVERY_ZONES, supabase, type StaffRole, type StaffRoleRow } from '../lib/supabase';
import { registerCustomer, loginCustomer, getOperatorStatus, type AuthProfile } from '../lib/auth';

export type UserProfile = {
  id?: string;
  name: string;
  phone: string;
  address: string;
  birthday: string;
  zone_id: string;
  email?: string | null;
};

const STORAGE_KEY = 'salonazo-profile-v2';

function loadProfile(): UserProfile | null {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) as UserProfile : null; } catch { return null; }
}

export function getProfileZone(p: UserProfile | null) {
  return p?.zone_id ? DELIVERY_ZONES.find(z => z.id === p.zone_id) ?? null : null;
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(loadProfile);
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [operatorAuthed, setOperatorAuthed] = useState(false);
  const [hasOperatorAuth, setHasOperatorAuth] = useState(false);

  // Fetch staff roles from staff_roles table
  useEffect(() => {
    if (!profile?.phone) { setStaffRoles([]); return; }
    let c = false; setRolesLoading(true);
    (async () => {
      try {
        const { data } = await supabase.from('staff_roles').select('*').eq('phone', profile.phone).eq('is_active', true);
        if (!c) setStaffRoles((data ?? []).map((r: StaffRoleRow) => r.role));
      } catch { if (!c) setStaffRoles([]); }
      finally { if (!c) setRolesLoading(false); }
    })();
    return () => { c = true; };
  }, [profile?.phone]);

  // Check if operator has email/password set up
  useEffect(() => {
    if (!profile?.phone || staffRoles.length === 0) { setHasOperatorAuth(false); return; }
    let c = false;
    (async () => {
      const { data } = await getOperatorStatus(profile.phone);
      if (!c && data) setHasOperatorAuth(data.hasOperatorAuth);
    })();
    return () => { c = true; };
  }, [profile?.phone, staffRoles]);

  const saveProfile = useCallback((p: UserProfile) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setProfile(p);
  }, []);

  const saveAuthProfile = useCallback((ap: AuthProfile, roles: StaffRole[]) => {
    const up: UserProfile = {
      id: ap.id,
      name: ap.name,
      phone: ap.phone,
      address: ap.address ?? '',
      birthday: ap.birthday ?? '',
      zone_id: ap.zone_id ?? '',
      email: ap.email,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(up));
    setProfile(up);
    setStaffRoles(roles);
  }, []);

  const clearProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
    setStaffRoles([]);
    setOperatorAuthed(false);
    setHasOperatorAuth(false);
  }, []);

  const register = useCallback(async (phone: string, name: string, pin: string, zone_id?: string, address?: string) => {
    const { data, error } = await registerCustomer(phone, name, pin, zone_id, address);
    if (error || !data) return { ok: false as const, error: error ?? 'Error' };
    // After registration, fetch staff roles (likely empty for new customers)
    const { data: rolesData } = await supabase.from('staff_roles').select('*').eq('phone', phone).eq('is_active', true);
    const roles = (rolesData ?? []).map((r: StaffRoleRow) => r.role);
    saveAuthProfile(data.profile, roles);
    return { ok: true as const };
  }, [saveAuthProfile]);

  const login = useCallback(async (phone: string, pin: string) => {
    const { data, error } = await loginCustomer(phone, pin);
    if (error || !data) return { ok: false as const, error: error ?? 'Error' };
    saveAuthProfile(data.profile, data.staffRoles);
    return { ok: true as const };
  }, [saveAuthProfile]);

  const grantOperatorAccess = useCallback(() => setOperatorAuthed(true), []);
  const revokeOperatorAccess = useCallback(() => setOperatorAuthed(false), []);

  const canAccessAdmin = staffRoles.includes('admin') || staffRoles.includes('cocina');
  const canAccessDelivery = staffRoles.includes('admin') || staffRoles.includes('delivery');
  const isOperator = staffRoles.length > 0;

  return {
    profile, saveProfile, clearProfile,
    register, login,
    staffRoles, rolesLoading,
    canAccessAdmin, canAccessDelivery, isOperator,
    operatorAuthed, grantOperatorAccess, revokeOperatorAccess,
    hasOperatorAuth,
  };
}
