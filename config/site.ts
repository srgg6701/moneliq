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

const endpoint = "https://653fb0ea9e8bd3be29e10cd4.mockapi.io/api/v1/";
const endpointCurrencies = `${endpoint}currencies/`;
const endpointBalances = `${endpoint}balances/`;

export { endpointCurrencies, endpointBalances };

