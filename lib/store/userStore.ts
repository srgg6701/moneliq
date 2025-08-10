import { create } from 'zustand';
import Cookies from 'js-cookie';

interface UserState {
  isAuthenticated: boolean;
  userType: 'member' | 'partner' | null;
  email: string | null;
  login: (userType: 'member' | 'partner', email: string) => void;
  logout: () => void;
  initializeUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  isAuthenticated: false,
  userType: null,
  email: null,

  login: (userType, email) => {
    set({ isAuthenticated: true, userType, email });

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('isAuthenticated', 'true');
      sessionStorage.setItem('userType', userType);
      sessionStorage.setItem('prevUserType', userType);
      sessionStorage.setItem('email', email);

      Cookies.set('isAuthenticated', 'true', {
        expires: 1,
        secure: process.env.NODE_ENV === 'production',
      });
      Cookies.set('userType', userType, {
        expires: 1,
        secure: process.env.NODE_ENV === 'production',
      });
    }
  },

  logout: () => {
    set({ isAuthenticated: false, userType: null, email: null });

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('userType');
      sessionStorage.removeItem('email');

      Cookies.remove('isAuthenticated');
      Cookies.remove('userType');
    }
  },

  initializeUser: () => {
    if (typeof window !== 'undefined') {
      const isAuthenticatedSession = sessionStorage.getItem('isAuthenticated') === 'true';
      const userTypeSession = sessionStorage.getItem('userType') as 'member' | 'partner' | null;
      const emailSession = sessionStorage.getItem('email');

      const isAuthenticatedCookie = Cookies.get('isAuthenticated') === 'true';
      const userTypeCookie = Cookies.get('userType') as 'member' | 'partner' | null;

      if (isAuthenticatedSession && userTypeSession && emailSession) {
        set({
          isAuthenticated: true,
          userType: userTypeSession,
          email: emailSession,
        });
      } else if (isAuthenticatedCookie && userTypeCookie) {
        set({
          isAuthenticated: true,
          userType: userTypeCookie,
          email: null,
        });
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('userType', userTypeCookie);
      }
    }
  },
}));
