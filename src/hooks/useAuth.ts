import { useState, useCallback } from 'react';

type Role = 'admin' | 'driver';

const SESSION_KEY = 'delivery-auth-v1';
const PINNED_ROLE_KEY = 'delivery-pinned-role';

const PASSWORDS: Record<Role, string> = {
  admin: 'salonazoadmin123',
  driver: 'salonazomoto456',
};

function loadSessions(): Record<Role, boolean> {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return { admin: false, driver: false };
    return JSON.parse(raw) as Record<Role, boolean>;
  } catch {
    return { admin: false, driver: false };
  }
}

function saveSessions(sessions: Record<Role, boolean>) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
}

export function getPinnedRole(): Role | null {
  try {
    return (localStorage.getItem(PINNED_ROLE_KEY) as Role | null) ?? null;
  } catch {
    return null;
  }
}

function pinRole(role: Role) {
  try { localStorage.setItem(PINNED_ROLE_KEY, role); } catch { /* noop */ }
}

function clearAll() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PINNED_ROLE_KEY);
  } catch { /* noop */ }
}

export function useAuth() {
  const [sessions, setSessions] = useState<Record<Role, boolean>>(loadSessions);

  const login = useCallback((role: Role, password: string): boolean => {
    if (password !== PASSWORDS[role]) return false;
    setSessions((prev) => {
      const next = { ...prev, [role]: true };
      saveSessions(next);
      return next;
    });
    pinRole(role);
    return true;
  }, []);

  // Full logout: wipe localStorage, force redirect to root
  const logout = useCallback((_role?: Role) => {
    clearAll();
    window.location.href = '/';
  }, []);

  return {
    isAdmin: sessions.admin,
    isDriver: sessions.driver,
    login,
    logout,
  };
}
