"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopMenu from "../components/TopMenu";
import Image from "next/image";
import axios, { AxiosError } from "axios";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchAdminCollections } from "@/app/lib/endpoints";

const BRAND_YELLOW = "#F4C82E";
const BRAND_DARK = "#333333";

const DAY_OPTIONS = [1, 3, 7, 14, 30, 90, 180, 365] as const;

function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}
function getAxiosStatus(error: unknown): number | null {
  if (!isAxiosError(error)) return null;
  return error.response?.status ?? null;
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR");
}

function formatNumber(n: number) {
  return n.toLocaleString("pt-BR");
}

export default function CollectionsPage() {
  const router = useRouter();

  const [guardLoading, setGuardLoading] = useState(true);
  const [days, setDays] = useState<number>(7);
  const [page, setPage] = useState<number>(1);

  // Guard do token
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

  // quando mudar days, volta pra página 1
  useEffect(() => {
    setPage(1);
  }, [days]);

  const collectionsQuery = useQuery({
    queryKey: ["admin-collections", days, page],
    queryFn: () => fetchAdminCollections(days, page),
    enabled: !guardLoading,
    placeholderData: keepPreviousData,
    retry: (failureCount, err) => {
      const status = getAxiosStatus(err);
      if (status === 401) return false;
      return failureCount < 2;
    },
  });

  if (guardLoading) return null;

  const resp = collectionsQuery.data ?? null;
  const loading = collectionsQuery.isLoading || collectionsQuery.isFetching;

  const collections = resp?.data ?? [];
  const total = resp?.total ?? 0;
  const from = resp?.from ?? 0;
  const to = resp?.to ?? 0;
  const perPage = resp?.per_page ?? 0;
  const currentPage = resp?.current_page ?? page;
  const hasPrev = resp?.prev_page != null;
  const hasNext = resp?.next_page != null;

  const errorMsg = collectionsQuery.isError
    ? (() => {
        const status = getAxiosStatus(collectionsQuery.error);
        return status
          ? `Erro ao carregar coleções (${status}).`
          : "Falha de rede ao carregar coleções.";
      })()
    : null;

  const Pagination = () => (
    <div className="flex items-center gap-2">
      <button
        disabled={!hasPrev || loading}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className="rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Anterior
      </button>

      <button
        disabled={!hasNext || loading}
        onClick={() => setPage((p) => p + 1)}
        className="rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: BRAND_DARK, color: "white" }}
      >
        Próxima
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopMenu />

      <main className="flex-1">
        {/* Header */}
        <section className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <h1
                    className="text-2xl sm:text-3xl font-extrabold"
                    style={{ color: BRAND_DARK }}
                  >
                    Coleções criadas
                  </h1>

                  <span
                    className="mt-2 inline-block rounded-full px-2.5 py-1 text-sm font-semibold"
                    style={{
                      backgroundColor: "rgba(244,200,46,0.25)",
                      color: BRAND_DARK,
                    }}
                  >
                    Total: {formatNumber(total)}
                  </span>

                  <p className="mt-2 text-sm text-gray-600">
                    Coleções criadas no período selecionado
                  </p>
                </div>

                {/* Filtro */}
                <div className="flex items-center gap-3">
                  <label
                    className="text-sm font-semibold"
                    style={{ color: BRAND_DARK }}
                  >
                    Período
                  </label>

                  <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="rounded-xl border bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2"
                    style={{ borderColor: "rgba(0,0,0,0.12)" }}
                  >
                    {DAY_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d} {d === 1 ? "dia" : "dias"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Conteúdo */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          {/* Barra de info + paginação */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-gray-700">
              {loading ? (
                <>Carregando coleções…</>
              ) : (
                <>
                  Mostrando{" "}
                  <b>
                    {from}-{to}
                  </b>{" "}
                  de <b>{formatNumber(total)}</b> — página <b>{currentPage}</b>{" "}
                  —{" "}
                  <span className="text-gray-500">({perPage} por página)</span>
                </>
              )}
            </div>

            <Pagination />
          </div>

          {/* Estados */}
          {errorMsg ? (
            <div className="mt-4 rounded-2xl border bg-white p-5 shadow-sm">
              <div
                className="text-sm font-semibold"
                style={{ color: BRAND_DARK }}
              >
                Não foi possível carregar
              </div>
              <div className="mt-1 text-sm text-gray-600">{errorMsg}</div>

              <button
                className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: BRAND_YELLOW, color: BRAND_DARK }}
                onClick={() => setPage((p) => p)}
              >
                Tentar novamente
              </button>
            </div>
          ) : loading ? (
            <div className="mt-4 grid gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[74px] rounded-2xl bg-gray-200 animate-pulse"
                />
              ))}
            </div>
          ) : collections.length === 0 ? (
            <div className="mt-4 rounded-2xl border bg-white p-6 shadow-sm">
              <div
                className="text-sm font-semibold"
                style={{ color: BRAND_DARK }}
              >
                Nenhuma coleção encontrada
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Não há coleções criadas nos últimos {days}{" "}
                {days === 1 ? "dia" : "dias"}.
              </div>
            </div>
          ) : (
            <>
              <div className="mt-4 overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="grid grid-cols-12 border-b bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
                  <div className="col-span-4">Coleção</div>
                  <div className="col-span-4">Criado por</div>
                  <div className="col-span-4">Criado em</div>
                </div>

                <ul className="divide-y">
                  {collections.map((c) => (
                    <li key={c.id} className="px-4 py-4">
                      <div className="grid grid-cols-12 items-center gap-3">
                        {/* Nome da coleção */}
                        <div className="col-span-4 min-w-0">
                          <span
                            className="truncate text-[13px] font-medium"
                            style={{ color: BRAND_DARK }}
                            title={c.name}
                          >
                            {c.name}
                          </span>
                        </div>

                        {/* Criado por */}
                        <div className="col-span-4 flex items-center gap-2 min-w-0">
                          <div
                            className="relative h-9 w-9 shrink-0 rounded-2xl overflow-hidden flex items-center justify-center border"
                            style={{ backgroundColor: "rgba(244,200,46,0.18)" }}
                          >
                            {c.user.avatar_url ? (
                              <Image
                                src={c.user.avatar_url}
                                alt={c.user.username ?? "Avatar do usuário"}
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            ) : (
                              <span
                                className="text-sm font-semibold"
                                style={{ color: BRAND_DARK }}
                              >
                                {(
                                  c.user.username?.slice(0, 1) ?? "?"
                                ).toUpperCase()}
                              </span>
                            )}
                          </div>

                          <span
                            className="truncate text-[13px] font-medium"
                            style={{ color: BRAND_DARK }}
                            title={c.user.username}
                          >
                            {c.user.username}
                          </span>
                        </div>

                        {/* Criado em */}
                        <div className="col-span-4 text-xs text-gray-600">
                          {formatDateTime(c.created_at)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Paginação no final */}
              <div className="mt-6 flex justify-end">
                <Pagination />
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
