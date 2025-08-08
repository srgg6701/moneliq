import { create } from 'zustand';
import Cookies from 'js-cookie'; // <-- Импортируем Cookies

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
      sessionStorage.setItem('email', email);
      // Also save in cookies for Middleware
      Cookies.set('isAuthenticated', 'true', { expires: 1, secure: process.env.NODE_ENV === 'production' }); // Кука на 1 день
      Cookies.set('userType', userType, { expires: 1, secure: process.env.NODE_ENV === 'production' });
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

      // Check both sessionStorage and cookies for the full picture
      const isAuthenticatedCookie = Cookies.get('isAuthenticated') === 'true';
      const userTypeCookie = Cookies.get('userType') as 'member' | 'partner' | null;

      if (isAuthenticatedSession && userTypeSession && emailSession) {
        set({ isAuthenticated: true, userType: userTypeSession, email: emailSession });
        // If only in sessionStorage, but not in cookies (e.g. after server restart), update cookies
        if (!isAuthenticatedCookie) {
          Cookies.set('isAuthenticated', 'true', { expires: 1, secure: process.env.NODE_ENV === 'production' });
          Cookies.set('userType', userTypeSession, { expires: 1, secure: process.env.NODE_ENV === 'production' });
        }
      } else if (isAuthenticatedCookie && userTypeCookie) {
         // If it is not in sessionStorage, but is in cookies (for example, after closing/opening the browser), restore the session
         set({ isAuthenticated: true, userType: userTypeCookie, email: null }); // Email can't be from cookies if not saved
         sessionStorage.setItem('isAuthenticated', 'true');
         sessionStorage.setItem('userType', userTypeCookie);
         // Email will have to be requested again or stored in cookies
      }
    }
  },
}));