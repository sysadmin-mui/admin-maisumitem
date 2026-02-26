"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BRAND_YELLOW = "#F4C82E";
const BRAND_DARK = "#333333";

function Tab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
      style={{
        color: active ? BRAND_DARK : "rgba(51,51,51,0.7)",
        backgroundColor: active ? BRAND_YELLOW : "transparent",
      }}
    >
      {label}
    </Link>
  );
}

export default function ContributionsSubMenu() {
  const pathname = usePathname();

  const itemsActive =
    pathname === "/contribuicoes/itens" ||
    pathname?.startsWith("/contribuicoes/itens/");
  const variationsActive =
    pathname === "/contribuicoes/variacoes" ||
    pathname?.startsWith("/contribuicoes/variacoes/");

  return (
    <div className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2">
          <div
            className="mr-2 text-md font-semibold"
            style={{ color: BRAND_DARK }}
          >
            Contribuições
          </div>

          <div className="inline-flex items-center gap-1 rounded-2xl border bg-white p-1">
            <Tab
              href="/contribuicoes/itens"
              label="Itens"
              active={itemsActive}
            />
            <Tab
              href="/contribuicoes/variacoes"
              label="Variações"
              active={variationsActive}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
