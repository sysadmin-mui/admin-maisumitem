"use client";

import Link from "next/link";
import Image from "next/image";

import { usePathname } from "next/navigation";

const BRAND_YELLOW = "#F4C82E";
const BRAND_DARK = "#333333";

const navItems = [
  { label: "Usuários", href: "/usuarios" },
  { label: "Coleções", href: "/colecoes" },
  { label: "Contribuições", href: "/contribuicoes/itens" },
  { label: "Tickets", href: "/tickets" },
];

export default function TopMenu() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: BRAND_DARK,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/home" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Mais um Item"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>

            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">
                Mais um Item
              </div>
              <div
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                Admin Console
              </div>
            </div>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-3 py-2 text-sm font-medium transition"
                  style={{
                    color: active ? BRAND_DARK : "rgba(255,255,255,0.85)",
                    backgroundColor: active ? BRAND_YELLOW : "transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side (placeholder) */}
          <div className="flex items-center gap-2">
            <div
              className="hidden sm:flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.85)",
              }}
              title="Ambiente"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: BRAND_YELLOW }}
              />
              Produção
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden pb-3">
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-3 py-2 text-sm font-medium transition"
                  style={{
                    color: active ? BRAND_DARK : "rgba(255,255,255,0.85)",
                    backgroundColor: active
                      ? BRAND_YELLOW
                      : "rgba(255,255,255,0.06)",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
