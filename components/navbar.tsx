"use client";
import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarItem,
} from "@heroui/navbar";

import { link as linkStyles } from "@heroui/theme";
import NextLink from "next/link";
import clsx from "clsx";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { useUserStore } from "@/lib/store/userStore";

export const Navbar = () => {
  const { isAuthenticated } = useUserStore();

  const menuList = () => {
    return siteConfig.navItems.map((item) => {
      if (item.protected && !isAuthenticated) {
        return null;
      }
      /* if (item.label === "Login" && isAuthenticated) {
        return null;
      } */
      if (item.label === "Logout" && !isAuthenticated) {
        return null;
      }
      return (
        <NavbarItem key={item.href}>
          <NextLink
            className={clsx(
              linkStyles({ color: "foreground" }),
              "data-[active=true]:text-primary data-[active=true]:font-medium",
            )}
            color="foreground"
            href={item.href}
          >
            {item.label}
          </NextLink>
        </NavbarItem>
      );
    });
  };

  return (
    <HeroUINavbar maxWidth="xl" position="sticky">
      <NavbarContent className="basis-1/5 sm:basis-full" justify="center">
        <div className="hidden gap-[10%] lg:flex w-full">
          <ul className="px-4 gap-4 flex items-center">{menuList()}</ul>
          <ThemeSwitch />
        </div>
      </NavbarContent>
      <NavbarContent className="basis-1 pl-4 lg:hidden" justify="end">
        <ThemeSwitch />
        {isAuthenticated && <NavbarMenuToggle />}
      </NavbarContent>
      {isAuthenticated && <NavbarMenu>
        <div className="mx-4 mt-2 flex flex-col gap-2">{menuList()}</div>
      </NavbarMenu>}
    </HeroUINavbar>
  );
};
