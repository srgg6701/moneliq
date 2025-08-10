'use client';
import { useEffect } from 'react';
import { useTheme } from 'next-themes';

import { useUserStore } from '@/lib/store/userStore';

export function ThemeAutoSwitch() {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, userType } = useUserStore();

  useEffect(() => {
    if (!userType) return;

    const isDark = theme?.toLowerCase().includes('dark');

    if (userType === 'member') {
      setTheme(isDark ? 'memberDark' : 'memberLight');
    } else if (userType === 'partner') {
      setTheme(isDark ? 'partnerDark' : 'partnerLight');
    }
  }, [isAuthenticated, userType]);

  return null;
}
