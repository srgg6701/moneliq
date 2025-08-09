"use client";
import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarItem,
} from "@heroui/navbar";
//import { Button } from "@heroui/button";
import { Kbd } from "@heroui/kbd";
//import { Link } from "@heroui/link";
import { Input } from "@heroui/input";
import { link as linkStyles } from "@heroui/theme";
import NextLink from "next/link";
import clsx from "clsx";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { SearchIcon } from "@/components/icons";
import { useUserStore } from "@/lib/store/userStore";

export const Navbar = () => {
  const { isAuthenticated } = useUserStore();

  const searchInput = (
    <Input
      aria-label="Search"
      classNames={{
        inputWrapper: "bg-default-100",
        input: "text-sm",
      }}
      endContent={
        <Kbd className="hidden lg:inline-block" keys={["command"]}>
          K
        </Kbd>
      }
      labelPlacement="outside"
      placeholder="Search..."
      startContent={
        <SearchIcon className="text-default-400 pointer-events-none flex-shrink-0 text-base" />
      }
      type="search"
    />
  );

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
          <ul className="gap-4 flex items-center">{menuList()}</ul>
          {isAuthenticated && searchInput}
          <ThemeSwitch />
        </div>
      </NavbarContent>
      <NavbarContent className="basis-1 pl-4 lg:hidden" justify="end">
        <ThemeSwitch />
        {isAuthenticated && <NavbarMenuToggle />}
      </NavbarContent>
      {isAuthenticated && <NavbarMenu>
        {searchInput}
        <div className="mx-4 mt-2 flex flex-col gap-2">{menuList()}</div>
      </NavbarMenu>}
    </HeroUINavbar>
  );
};
