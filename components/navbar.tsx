"use client";
import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
} from "@heroui/navbar";
import Link from "next/link";
import clsx from "clsx";
import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { useUserStore } from "@/lib/store/userStore";
import { usePathname } from "next/navigation";

export const Navbar = () => {
  const { isAuthenticated } = useUserStore();
  const pathname = usePathname();

  const items = siteConfig.navItems.filter((item) => {
    if (item.protected && !isAuthenticated) return false;
    if (item.label === "Logout" && !isAuthenticated) return false;
    return true;
  });

  const menuList = () => (
    <>
      {items.map((item) => (
        <li key={item.href} className="list-none">
          <Link
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
            className={clsx(
              "px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2",
              "data-[active=true]:text-primary data-[active=true]:font-medium"
            )}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </>
  );

  return (
    <HeroUINavbar maxWidth="xl" position="sticky" as="nav" aria-label="Main">
      {/* desktop */}
      <NavbarContent className="basis-1/5 sm:basis-full" justify="center">
        <div className="hidden gap-[10%] lg:flex items-center">
          <ul className="px-4 gap-4 flex items-center">{menuList()}</ul>
          <ThemeSwitch />
        </div>
      </NavbarContent>
      {/* mobile */}
      <NavbarContent className="basis-1 pl-4 lg:hidden" justify="end">
        <ThemeSwitch />
        {isAuthenticated && (
          <NavbarMenuToggle
            aria-controls="main-menu"
            aria-label="Open menu"
          />
        )}
      </NavbarContent>
      {isAuthenticated && (
        <NavbarMenu id="main-menu">
          <ul className="mx-4 mt-2 flex flex-col gap-2">{menuList()}</ul>
        </NavbarMenu>
      )}
    </HeroUINavbar>
  );
};
