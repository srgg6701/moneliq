import { create } from 'zustand';

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
    }
  },
  logout: () => {
    set({ isAuthenticated: false, userType: null, email: null });
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('userType');
      sessionStorage.removeItem('email');
    }
  },
  initializeUser: () => {
    if (typeof window !== 'undefined') {
      const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
      const userType = sessionStorage.getItem('userType') as 'member' | 'partner' | null;
      const email = sessionStorage.getItem('email');
      if (isAuthenticated && userType && email) {
        set({ isAuthenticated: true, userType, email });
      }
    }
  },
}));