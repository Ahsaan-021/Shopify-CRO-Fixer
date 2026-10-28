"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { siteConfig } from "@/lib/site";

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex min-h-[4.5rem] max-w-6xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Brand />

        <nav aria-label="Main navigation" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {siteConfig.nav.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-accent-soft text-accent-dark"
                        : "text-ink-soft hover:bg-white hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ButtonLink href="/audit" size="sm">
            Free audit
            <Icon name="arrow-right" size={16} />
          </ButtonLink>
        </div>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-full border border-line-strong bg-white text-ink md:hidden"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setIsOpen((open) => !open)}
        >
          <Icon name={isOpen ? "close" : "menu"} size={22} />
        </button>
      </div>

      {isOpen ? (
        <div
          id="mobile-navigation"
          className="border-t border-line bg-white md:hidden"
        >
          <nav aria-label="Mobile navigation" className="px-4 py-4 sm:px-6">
            <ul className="space-y-1">
              {siteConfig.nav.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium ${
                        active
                          ? "bg-accent-soft text-accent-dark"
                          : "text-ink-soft hover:bg-canvas"
                      }`}
                    >
                      {item.label}
                      <Icon name="chevron-right" size={17} />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <ButtonLink
              href="/audit"
              size="md"
              className="mt-4 w-full"
              onClick={() => setIsOpen(false)}
            >
              Run a free audit
              <Icon name="arrow-right" size={17} />
            </ButtonLink>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
