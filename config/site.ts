export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: 'Next.js + HeroUI',
  description: 'Make beautiful websites regardless of your design experience.',
  navItems: [
    {
      label: 'Dashboard',
      href: '/',
    },
    {
      label: 'Balancies',
      href: '/balancies',
    },
    {
      label: 'Currencies',
      href: '/currencies',
    },
    {
      label: 'Login',
      href: '/login',
    },
    {
      label: 'Logout',
      href: '/logout',
    },
  ],
};
