import { useCallback, useState } from 'react';
import { DELIVERY_ZONES } from '../lib/supabase';

export type UserProfile = {
  name: string;
  phone: string;
  address: string;
  birthday: string; // "MM-DD"
  zone_id: string;
};

const STORAGE_KEY = 'salonazo-profile-v1';

function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function isBirthdayToday(birthday: string): boolean {
  if (!birthday) return false;
  const today = new Date();
  const [mm, dd] = birthday.split('-');
  return (
    parseInt(mm, 10) === today.getMonth() + 1 &&
    parseInt(dd, 10) === today.getDate()
  );
}

export function getProfileZone(profile: UserProfile | null) {
  if (!profile?.zone_id) return null;
  return DELIVERY_ZONES.find(z => z.id === profile.zone_id) ?? null;
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(loadProfile);

  const saveProfile = useCallback((p: UserProfile) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setProfile(p);
  }, []);

  const clearProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
  }, []);

  const loginByPhone = useCallback((phone: string): boolean => {
    const stored = loadProfile();
    if (stored && stored.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')) {
      setProfile(stored);
      return true;
    }
    return false;
  }, []);

  return { profile, saveProfile, clearProfile, loginByPhone };
}
