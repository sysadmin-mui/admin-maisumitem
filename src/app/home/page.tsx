"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TopMenu from "../components/TopMenu";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import axios, { AxiosError } from "axios";

import { fetchAdminStats } from "@/app/lib/endpoints";

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
  description,
}: {
  title: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="flex min-h-36 flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <div className="mt-5">
        <p className="text-3xl font-extrabold tabular-nums tracking-tight text-[#303030]">
          {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
        </p>
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      </div>
    </div>
  );
}

const quickLinks = [
  {
    href: "/produtos",
    title: "Todos os produtos",
    description: "Consultar produtos por período, objeto e loja.",
  },
  {
    href: "/products",
    title: "Corrigir produtos",
    description: "Revisar marcas e times ausentes do catálogo.",
  },
  {
    href: "/usuarios",
    title: "Usuários",
    description: "Consultar e moderar contas cadastradas.",
  },
  {
    href: "/colecoes",
    title: "Coleções",
    description: "Acompanhar coleções e aprovações.",
  },
  {
    href: "/contribuicoes/itens",
    title: "Contribuições",
    description: "Avaliar itens, imagens e metadados enviados.",
  },
  {
    href: "/tickets",
    title: "Tickets",
    description: "Acompanhar solicitações e denúncias.",
  },
];

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
  const statsLoading = statsQuery.isLoading;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-[#303030]">
      <TopMenu />

      <main className="flex-1">
        <section className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-4 py-8 sm:px-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                Painel administrativo
              </p>
              <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                Visão geral
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Acompanhe os cadastros e acesse as áreas do admin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem("adminToken");
                router.replace("/");
              }}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold transition hover:bg-gray-50"
            >
              Sair do admin
            </button>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
          <section aria-labelledby="home-summary-title">
            <div className="mb-4">
              <h2 id="home-summary-title" className="text-lg font-bold">
                Resumo
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Totais cadastrados no sistema.
              </p>
            </div>

            {statsQuery.isError && (
              <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                Não foi possível carregar os totais.
                <button
                  type="button"
                  onClick={() => statsQuery.refetch()}
                  className="ml-2 font-semibold underline"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {statsLoading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="h-36 animate-pulse rounded-2xl border border-gray-200 bg-white" />
                ))
              ) : (
                <>
                  <StatCard title="Usuários" value={stats?.users ?? "—"} description="Contas cadastradas" />
                  <StatCard title="Coleções" value={stats?.collections ?? "—"} description="Criadas no sistema" />
                  <StatCard title="Itens" value={stats?.items ?? "—"} description="Catalogados" />
                  <StatCard title="Posts" value={stats?.posts ?? "—"} description="Publicados" />
                  <StatCard title="Produtos" value={stats?.products ?? "—"} description="Cadastrados nas lojas" />
                </>
              )}
            </div>
          </section>

          <section aria-labelledby="home-links-title">
            <div className="mb-4">
              <h2 id="home-links-title" className="text-lg font-bold">
                Acessos rápidos
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Escolha a área que deseja administrar.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex min-h-32 flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[#d9b323] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c6a520]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold">{link.title}</h3>
                    <span aria-hidden="true" className="text-lg leading-none text-gray-400 transition group-hover:text-[#806600]">
                      ↗
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-5 text-gray-600">
                    {link.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <footer className="border-t border-gray-200 pt-5 pb-6 text-xs text-gray-400">
            © {new Date().getFullYear()} Mais um Item — Admin
          </footer>
        </div>
      </main>
    </div>
  );
}
