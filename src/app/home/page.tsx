"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TopMenu from "../components/TopMenu";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import axios, { AxiosError } from "axios";

import { fetchAdminStats } from "@/app/lib/endpoints";

const BRAND_YELLOW = "#F4C82E";
const BRAND_DARK = "#333333";

function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

function getAxiosStatus(error: unknown): number | null {
  if (!isAxiosError(error)) return null;
  return error.response?.status ?? null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "UNKNOWN_ERROR";
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold" style={{ color: BRAND_DARK }}>
            {title}
          </div>
          <div
            className="mt-2 text-3xl font-extrabold"
            style={{ color: BRAND_DARK }}
          >
            {value}
          </div>
          {subtitle ? (
            <div className="mt-1 text-xs text-gray-500">{subtitle}</div>
          ) : null}
        </div>

        <div
          className="h-10 w-10 rounded-2xl"
          style={{ backgroundColor: "rgba(244,200,46,0.25)" }}
          aria-hidden
        />
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();

  const [guardLoading, setGuardLoading] = useState(true);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const token = sessionStorage.getItem("adminToken");

      if (!token) {
        router.replace("/");
        return;
      }
      setGuardLoading(false);
    } catch {
      router.replace("/");
    }
  }, [router]);

  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchAdminStats,
    enabled: !guardLoading,
    retry: (failureCount, err) => {
      const msg = getErrorMessage(err);
      const status = getAxiosStatus(err);

      if (msg === "NO_TOKEN") return false;
      if (status === 401) return false;

      return failureCount < 2;
    },
  });

  if (guardLoading) return null;

  const stats = statsQuery.data ?? null;
  const statsLoading = statsQuery.isLoading || statsQuery.isFetching;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopMenu />

      <main className="flex-1">
        {/* Header da página */}
        <section className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: BRAND_YELLOW }}
                />
                <span className="text-sm text-gray-500">
                  Painel administrativo
                </span>
              </div>

              <h1
                className="text-2xl sm:text-3xl font-extrabold"
                style={{ color: BRAND_DARK }}
              >
                Login admin efetuado com sucesso
              </h1>
            </div>
          </div>
        </section>

        {/* Conteúdo */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          {/* Cards de resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsLoading ? (
              <>
                <div className="h-[120px] rounded-2xl bg-gray-200 animate-pulse" />
                <div className="h-[120px] rounded-2xl bg-gray-200 animate-pulse" />
                <div className="h-[120px] rounded-2xl bg-gray-200 animate-pulse" />
                <div className="h-[120px] rounded-2xl bg-gray-200 animate-pulse" />
              </>
            ) : (
              <>
                <StatCard
                  title="Usuários cadastrados"
                  value={stats?.users ?? 0}
                  subtitle="Total no sistema"
                />
                <StatCard
                  title="Coleções criadas"
                  value={stats?.collections ?? 0}
                  subtitle="Total de coleções"
                />
                <StatCard
                  title="Itens catalogados"
                  value={stats?.items ?? 0}
                  subtitle="Total de itens"
                />
                <StatCard
                  title="Posts publicados"
                  value={stats?.posts ?? 0}
                  subtitle="Total de posts"
                />
              </>
            )}
          </div>

          {/* Ações rápidas */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    className="text-lg font-bold"
                    style={{ color: BRAND_DARK }}
                  >
                    Ações rápidas
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Entradas diretas para as áreas mais usadas no dia a dia.
                  </p>
                </div>
                <div
                  className="h-12 w-12 rounded-2xl"
                  style={{ backgroundColor: "rgba(244,200,46,0.18)" }}
                  aria-hidden
                />
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/usuarios"
                  className="rounded-2xl border px-4 py-4 hover:shadow-sm transition bg-white"
                >
                  <div
                    className="text-sm font-semibold"
                    style={{ color: BRAND_DARK }}
                  >
                    Usuários
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    Visualizar, buscar e moderar contas.
                  </div>
                </Link>

                <Link
                  href="/colecoes"
                  className="rounded-2xl border px-4 py-4 hover:shadow-sm transition bg-white"
                >
                  <div
                    className="text-sm font-semibold"
                    style={{ color: BRAND_DARK }}
                  >
                    Coleções
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    Revisar coleções, aprovações e organização.
                  </div>
                </Link>

                <Link
                  href="/contribuicoes/itens"
                  className="rounded-2xl border px-4 py-4 hover:shadow-sm transition bg-white"
                >
                  <div
                    className="text-sm font-semibold"
                    style={{ color: BRAND_DARK }}
                  >
                    Contribuições
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    Avaliar envios (imagens, itens, metadados).
                  </div>
                </Link>

                <Link
                  href="/tickets"
                  className="rounded-2xl border px-4 py-4 hover:shadow-sm transition bg-white"
                >
                  <div
                    className="text-sm font-semibold"
                    style={{ color: BRAND_DARK }}
                  >
                    Tickets
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    Suporte, denúncias e solicitações.
                  </div>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold" style={{ color: BRAND_DARK }}>
                Status
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Indicadores rápidos (placeholder).
              </p>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-gray-50 p-4 border">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: BRAND_DARK }}
                    >
                      API (admin)
                    </span>
                    <span
                      className="text-xs font-bold rounded-full px-2 py-1"
                      style={{
                        backgroundColor: "rgba(244,200,46,0.25)",
                        color: BRAND_DARK,
                      }}
                    >
                      OK
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full w-4/5"
                      style={{ backgroundColor: BRAND_YELLOW }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Depois a gente pluga uptime/healthcheck real.
                  </div>
                </div>

                <button
                  className="w-full rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99]"
                  style={{ backgroundColor: BRAND_DARK, color: "white" }}
                  onClick={() => {
                    sessionStorage.removeItem("adminToken");
                    router.replace("/");
                  }}
                >
                  Sair do admin
                </button>
              </div>
            </div>
          </div>

          <footer className="mt-10 pb-6 text-xs text-gray-400">
            © {new Date().getFullYear()} Mais um Item — Admin
          </footer>
        </section>
      </main>
    </div>
  );
}
