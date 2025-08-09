export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: 'Moneliq Easy Task',
  description: 'Frontend Assessment for a potential Employer',
  navItems: [
    {
      label: 'Dashboard',
      href: '/dashboard',
      protected: true,
    },
    {
      label: 'Balances',
      href: '/balances',
      protected: true,
    },
    {
      label: 'Logout',
      href: '/logout',
      protected: true,
    },
  ],
};
