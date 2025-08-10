'use client';
import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
} from '@heroui/navbar';
import Link from 'next/link';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';

import { siteConfig } from '@/config/site';
import { ThemeSwitch } from '@/components/theme-switch';
import { useUserStore } from '@/lib/store/userStore';

export const Navbar = () => {
  const { isAuthenticated } = useUserStore();
  const pathname = usePathname();

  const items = siteConfig.navItems.filter((item) => {
    if (item.protected && !isAuthenticated) return false;
    if (item.label === 'Logout' && !isAuthenticated) return false;

    return true;
  });

  const menuList = () => (
    <>
      {items.map((item) => (
        <li key={item.href} className="list-none">
          <Link
            aria-current={pathname === item.href ? 'page' : undefined}
            className={clsx(
              'rounded px-3 py-2 focus:ring-2 focus:ring-offset-2 focus:outline-none',
              'data-[active=true]:text-primary data-[active=true]:font-medium',
            )}
            href={item.href}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </>
  );

  return (
    <HeroUINavbar aria-label="Main" as="nav" maxWidth="xl" position="sticky">
      {/* desktop */}
      <NavbarContent className="basis-1/5 sm:basis-full" justify="center">
        <div className="hidden items-center gap-[10%] lg:flex">
          <ul className="flex items-center gap-4 px-4">{menuList()}</ul>
          <ThemeSwitch />
        </div>
      </NavbarContent>
      {/* mobile */}
      <NavbarContent className="basis-1 pl-4 lg:hidden" justify="end">
        <ThemeSwitch />
        {isAuthenticated && <NavbarMenuToggle aria-controls="main-menu" aria-label="Open menu" />}
      </NavbarContent>
      {isAuthenticated && (
        <NavbarMenu id="main-menu">
          <ul className="mx-4 mt-2 flex flex-col gap-2">{menuList()}</ul>
        </NavbarMenu>
      )}
    </HeroUINavbar>
  );
};
