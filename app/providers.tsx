'use client';

import type { ThemeProviderProps } from 'next-themes';

import * as React from 'react';
import { HeroUIProvider } from '@heroui/system';
import { useRouter } from 'next/navigation';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

import { useUserStore } from '@/lib/store/userStore';

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

declare module '@react-types/shared' {
  interface RouterConfig {
    routerOptions: NonNullable<Parameters<ReturnType<typeof useRouter>['push']>[1]>;
  }
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();
  const initializeUser = useUserStore((state) => state.initializeUser);

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true); // Set mounted to true after initial client-side render
    initializeUser();
  }, [initializeUser]);

  // Only render children after component has mounted on the client
  // This ensures hydration happens correctly without mismatch.
  // While `next-themes` and Zustand might handle some of this internally,
  // this is a robust fallback for hydration issues.
  if (!mounted) {
    return null;
  }

  return (
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider {...themeProps}>{children}</NextThemesProvider>
    </HeroUIProvider>
  );
}
