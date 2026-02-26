"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import TopMenu from "../../components/TopMenu";
import ContributionsSubMenu from "../../components/ContributionsSubMenu";
import ItemImageCarousel from "../../components/ItemImageCarousel";

import axios, { AxiosError } from "axios";

import Image from "next/image";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  fetchAdminVariations,
  approveAdminVariation,
  patchAdminVariation,
  deleteAdminVariation,
} from "@/app/lib/endpoints";

import { IStatsVariationPaginate } from "@/app/lib/types";

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "UNKNOWN_ERROR";
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

export default function ContributionVariationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [guardLoading, setGuardLoading] = useState(true);

  const [days, setDays] = useState<number>(7);
  const [page, setPage] = useState<number>(1);

  const [openItemForVariationId, setOpenItemForVariationId] = useState<
    string | null
  >(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [approveOpenId, setApproveOpenId] = useState<string | null>(null);

  const [editOpenId, setEditOpenId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState<string>("");

  const [delVarOpen, setDelVarOpen] = useState(false);
  const [delVar, setDelVar] = useState<(typeof variations)[number] | null>(
    null,
  );
  const [delVarReason, setDelVarReason] = useState("");
  const [delVarErr, setDelVarErr] = useState<string | null>(null);

  // Guard
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

  useEffect(() => {
    setPage(1);
  }, [days]);

  const variationsQuery = useQuery({
    queryKey: ["admin-variations", days, page],
    queryFn: () => fetchAdminVariations(days, page),
    enabled: !guardLoading,
    placeholderData: keepPreviousData,
    retry: (failureCount, err) => {
      const msg = getErrorMessage(err);
      const status = getAxiosStatus(err);

      if (msg === "NO_TOKEN") return false;
      if (status === 401) return false;

      return failureCount < 2;
    },
  });

  // ✅ Mutation: aprovar variação + atualizar cache
  const approveMutation = useMutation({
    mutationFn: (variationId: string) => approveAdminVariation(variationId),
    onSuccess: (_data, variationId) => {
      queryClient.setQueryData<IStatsVariationPaginate>(
        ["admin-variations", days, page],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            data: prev.data.map((v) =>
              v.id === variationId ? { ...v, approved: true } : v,
            ),
          };
        },
      );

      setApproveOpenId(null);
    },
    onError: (err) => {
      const error = err as AxiosError;

      if (error.response?.status === 401) {
        sessionStorage.removeItem("adminToken");
        router.replace("/");
        return;
      }

      alert(
        error.response
          ? `Erro ao aprovar variação (${error.response.status}).`
          : "Falha de rede ao aprovar variação.",
      );
    },
  });

  const editMutation = useMutation({
    mutationFn: ({
      variationId,
      description,
    }: {
      variationId: string;
      description: string;
    }) => patchAdminVariation(variationId, { description }),

    onSuccess: (_data, vars) => {
      queryClient.setQueryData<IStatsVariationPaginate>(
        ["admin-variations", days, page],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            data: prev.data.map((v) =>
              v.id === vars.variationId
                ? { ...v, description: vars.description }
                : v,
            ),
          };
        },
      );

      setEditOpenId(null);
      setEditDescription("");
    },

    onError: (err) => {
      const error = err as AxiosError;

      if (error.response?.status === 401) {
        sessionStorage.removeItem("adminToken");
        router.replace("/");
        return;
      }

      alert(
        error.response
          ? `Erro ao editar variação (${error.response.status}).`
          : "Falha de rede ao editar variação.",
      );
    },
  });

  // Mutation: excluir variação
  const deleteMutation = useMutation({
    mutationFn: async (vars: { id: string; reason: string }) => {
      await deleteAdminVariation(vars.id, vars.reason);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-variations", days, page],
      });

      setDelVarOpen(false);
      setDelVar(null);
      setDelVarReason("");
      setDelVarErr(null);
    },

    onError: (err) => {
      const status = getAxiosStatus(err);

      // se você quiser manter o comportamento de "deslogar" em 401, igual approve/edit:
      if (status === 401) {
        sessionStorage.removeItem("adminToken");
        router.replace("/");
        return;
      }

      setDelVarErr(
        status
          ? `Erro ao excluir variação (${status}).`
          : "Falha ao excluir variação.",
      );
    },
  });

  if (guardLoading) return null;

  const resp = variationsQuery.data ?? null;

  const variations = resp?.data ?? [];
  const total = resp?.total ?? 0;
  const from = resp?.from ?? 0;
  const to = resp?.to ?? 0;
  const perPage = resp?.per_page ?? 0;
  const currentPage = resp?.current_page ?? page;

  const hasPrev = resp?.prev_page !== null && resp?.prev_page !== undefined;
  const hasNext = resp?.next_page !== null && resp?.next_page !== undefined;

  const loading = variationsQuery.isLoading;
  const errorMsg = variationsQuery.error
    ? (() => {
        const err = variationsQuery.error;

        // você pode manter exatamente como no Items (se lá já formata bonitinho)
        if (err instanceof AxiosError) {
          if (err.response)
            return `Erro ao carregar variações (${err.response.status}).`;
          return "Falha de rede ao carregar variações.";
        }
        const msg = getErrorMessage(err);
        return msg || "Não foi possível carregar.";
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

  function handleOpenApprove(variationId: string) {
    setApproveOpenId(variationId);
  }

  function handleConfirmApprove(variationId: string) {
    if (approveMutation.isPending) return;
    approveMutation.mutate(variationId);
  }

  function handleOpenEdit(variationId: string, currentDescription: string) {
    setEditOpenId(variationId);
    setEditDescription(currentDescription ?? "");
  }

  function handleCloseEdit() {
    if (editMutation.isPending) return;
    setEditOpenId(null);
    setEditDescription("");
  }

  function handleConfirmEdit() {
    if (!editOpenId) return;
    if (editMutation.isPending) return;

    const desc = editDescription.trim();

    if (!desc) {
      alert("A descrição não pode ficar vazia.");
      return;
    }

    editMutation.mutate({ variationId: editOpenId, description: desc });
  }

  function handleOpenDeleteVariation(v: (typeof variations)[number]) {
    setDelVarErr(null);
    setDelVarReason("");
    setDelVar(v);
    setDelVarOpen(true);
  }

  function handleConfirmDeleteVariation() {
    if (!delVar) return;

    const reason = delVarReason.trim();
    if (!reason) {
      setDelVarErr("Informe um motivo.");
      return;
    }

    deleteMutation.mutate({ id: delVar.id, reason });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopMenu />
      <ContributionsSubMenu />

      <main className="flex-1">
        <section className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1
                  className="text-2xl sm:text-3xl font-extrabold"
                  style={{ color: BRAND_DARK }}
                >
                  Contribuições — Variações
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
                  Variações criadas no período selecionado
                </p>
              </div>

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
        </section>

        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-gray-700">
              {loading ? (
                <>Carregando variações…</>
              ) : (
                <>
                  Mostrando{" "}
                  <b>
                    {from}-{to}
                  </b>{" "}
                  de <b>{formatNumber(total)}</b> — página <b>{currentPage}</b>{" "}
                  —{" "}
                  <span className="text-gray-500">({perPage} por página)</span>
                  {variationsQuery.isFetching ? (
                    <span className="ml-2 text-xs text-gray-400">
                      Atualizando…
                    </span>
                  ) : null}
                </>
              )}
            </div>

            <Pagination />
          </div>

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
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["admin-variations", days, page],
                  })
                }
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
          ) : variations.length === 0 ? (
            <div className="mt-4 rounded-2xl border bg-white p-6 shadow-sm">
              <div
                className="text-sm font-semibold"
                style={{ color: BRAND_DARK }}
              >
                Nenhuma variação encontrada
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Não há variações nos últimos {days}{" "}
                {days === 1 ? "dia" : "dias"}.
              </div>
            </div>
          ) : (
            <>
              <div className="mt-4 overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="grid grid-cols-12 border-b bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
                  <div className="col-span-4">Variação</div>
                  <div className="col-span-3">Imagens</div>
                  <div className="col-span-2">Criado em</div>
                  <div className="col-span-3">Ações</div>
                </div>

                <ul className="divide-y">
                  {variations.map((v) => (
                    <li key={v.id} className="px-4 py-4">
                      <div className="grid grid-cols-12 items-center gap-3">
                        {/* Variação */}
                        <div className="col-span-4 min-w-0">
                          <div
                            className="text-[13px] font-medium whitespace-pre-wrap break-words"
                            style={{ color: BRAND_DARK }}
                            title={v.description}
                          >
                            {v.description}
                          </div>

                          {v.contributor ? (
                            <div className="mt-0.5 truncate text-xs text-gray-500">
                              Quem contribuiu: {v.contributor}
                            </div>
                          ) : null}

                          {/* Botão: Ver item */}
                          {v.item ? (
                            <div className="mt-5">
                              <button
                                type="button"
                                className="inline-flex items-center rounded-xl px-3 py-1.5 text-[11px] font-extrabold transition hover:opacity-90"
                                style={{
                                  backgroundColor: BRAND_YELLOW,
                                  color: BRAND_DARK,
                                }}
                                onClick={() => setOpenItemForVariationId(v.id)}
                              >
                                Ver item vinculado
                              </button>
                            </div>
                          ) : null}

                          {/* Modal: Item da variação */}
                          {v.item && openItemForVariationId === v.id ? (
                            <div
                              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                              onClick={() => setOpenItemForVariationId(null)}
                            >
                              <div
                                className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Header */}
                                <div className="flex items-center justify-between border-b px-5 py-4">
                                  <div className="min-w-0">
                                    <div
                                      className="text-sm font-extrabold"
                                      style={{ color: BRAND_DARK }}
                                    >
                                      Item vinculado
                                    </div>
                                    <div className="mt-0.5 truncate text-xs text-gray-500">
                                      {v.item.object || "Item"}{" "}
                                      {v.item.slug ? `• ${v.item.slug}` : ""}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    className="cursor-pointer rounded-xl px-3 py-2 text-xs font-extrabold transition hover:bg-gray-100"
                                    style={{ color: BRAND_DARK }}
                                    onClick={() =>
                                      setOpenItemForVariationId(null)
                                    }
                                  >
                                    Fechar
                                  </button>
                                </div>

                                {/* Body */}
                                <div className="p-5">
                                  <div className="flex gap-4">
                                    {/* Imagem */}
                                    <div className="relative w-30 aspect-[8/11] flex-none overflow-hidden rounded-2xl bg-gray-100">
                                      {v.item.images_url?.[0] ? (
                                        <Image
                                          src={v.item.images_url[0]}
                                          alt={v.item.object || "Item"}
                                          fill
                                          className="object-cover"
                                          sizes="80px"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                                          Sem foto
                                        </div>
                                      )}
                                    </div>

                                    {/* Infos */}
                                    <div className="min-w-0 flex-1">
                                      {v.item.slug ? (
                                        <div className="truncate text-xs text-gray-500">
                                          <span
                                            className="font-semibold"
                                            style={{ color: BRAND_DARK }}
                                          >
                                            Slug:
                                          </span>{" "}
                                          {v.item.slug}
                                        </div>
                                      ) : null}

                                      <div className="mt-2 space-y-1 text-xs text-gray-700">
                                        {v.item.info1 ? (
                                          <div>
                                            <b>Info1:</b> {v.item.info1}
                                          </div>
                                        ) : null}
                                        {v.item.info2 ? (
                                          <div>
                                            <b>Info2:</b> {v.item.info2}
                                          </div>
                                        ) : null}
                                        {v.item.info3 ? (
                                          <div>
                                            <b>Info3:</b> {v.item.info3}
                                          </div>
                                        ) : null}
                                        {v.item.info4 ? (
                                          <div>
                                            <b>Info4:</b> {v.item.info4}
                                          </div>
                                        ) : null}
                                        {v.item.info5 ? (
                                          <div>
                                            <b>Info5:</b> {v.item.info5}
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Footer */}
                                <div className="flex justify-end gap-2 border-t px-5 py-4">
                                  <button
                                    type="button"
                                    className="rounded-xl px-4 py-2 text-xs font-extrabold transition hover:opacity-90"
                                    style={{
                                      backgroundColor: BRAND_YELLOW,
                                      color: BRAND_DARK,
                                    }}
                                    onClick={() =>
                                      setOpenItemForVariationId(null)
                                    }
                                  >
                                    OK
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {/* Carousel */}
                        <div className="col-span-3">
                          <ItemImageCarousel
                            images={v.images_url}
                            alt={"Imagem da variação"}
                            size={120}
                            onOpen={(src) => setPreviewImage(src)}
                          />
                        </div>

                        {/* Criado em */}
                        <div className="col-span-2 text-xs text-gray-600">
                          {formatDateTime(v.created_at)}
                        </div>

                        {/* Ações */}
                        <div className="col-span-3 flex items-center justify-start gap-4">
                          {v.approved ? (
                            <div
                              className="inline-flex items-center rounded-full px-3 py-2 text-xs font-extrabold"
                              style={{
                                backgroundColor: "rgba(34,197,94,0.12)",
                                color: "#166534",
                              }}
                              title="Variação já validada"
                            >
                              Aprovado ✓
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <button
                                  className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                                  style={{
                                    backgroundColor: BRAND_YELLOW,
                                    color: BRAND_DARK,
                                  }}
                                  onClick={() => handleOpenApprove(v.id)}
                                >
                                  Aprovar
                                </button>

                                <button
                                  className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                                  style={{
                                    backgroundColor: BRAND_YELLOW,
                                    color: BRAND_DARK,
                                  }}
                                  onClick={() =>
                                    handleOpenEdit(v.id, v.description)
                                  }
                                >
                                  Editar
                                </button>
                              </div>

                              <button
                                className="ml-auto rounded-lg px-2.5 py-1.5 text-xs font-semibold border"
                                style={{
                                  backgroundColor: "rgba(239,68,68,0.12)",
                                  color: "#B91C1C",
                                  borderColor: "rgba(185,28,28,0.35)",
                                }}
                                onClick={() => handleOpenDeleteVariation(v)}
                              >
                                Excluir
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex justify-end">
                <Pagination />
              </div>
            </>
          )}
        </section>

        {/* Modal preview */}
        {previewImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="relative max-w-5xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 text-white text-2xl font-bold"
              >
                ✕
              </button>

              <div className="relative w-full h-[80vh] rounded-2xl overflow-hidden bg-black">
                <Image
                  src={previewImage}
                  alt="Imagem ampliada"
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        )}

        {/* ✅ Modal Aprovar */}
        {approveOpenId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => !approveMutation.isPending && setApproveOpenId(null)}
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div className="min-w-0">
                  <div
                    className="text-sm font-extrabold"
                    style={{ color: BRAND_DARK }}
                  >
                    Aprovar variação?
                  </div>
                  <div className="mt-0.5 truncate text-xs text-gray-500">
                    Essa ação marca a variação como aprovada.
                  </div>
                </div>

                <button
                  type="button"
                  disabled={approveMutation.isPending}
                  className="cursor-pointer rounded-xl px-3 py-2 text-xs font-extrabold transition hover:bg-gray-100 disabled:opacity-50"
                  style={{ color: BRAND_DARK }}
                  onClick={() => setApproveOpenId(null)}
                >
                  Fechar
                </button>
              </div>

              {/* Body */}
              <div className="p-5">
                {(() => {
                  const v = variations.find((x) => x.id === approveOpenId);
                  if (!v) return null;

                  return (
                    <div className="flex gap-4">
                      <div className="relative w-24 aspect-[8/11] flex-none overflow-hidden rounded-2xl bg-gray-100">
                        {v.images_url?.[0] ? (
                          <Image
                            src={v.images_url[0]}
                            alt="Variação"
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                            Sem foto
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div
                          className="text-xs font-semibold"
                          style={{ color: BRAND_DARK }}
                        >
                          Descrição
                        </div>

                        <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap break-words">
                          {v.description}
                        </div>

                        {v.item?.slug ? (
                          <div className="mt-2 text-xs text-gray-500 truncate">
                            Item:{" "}
                            <b style={{ color: BRAND_DARK }}>{v.item.slug}</b>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
                <button
                  type="button"
                  disabled={approveMutation.isPending}
                  className="rounded-xl border px-4 py-2 text-xs font-extrabold disabled:opacity-50"
                  style={{ color: BRAND_DARK, borderColor: "rgba(0,0,0,0.12)" }}
                  onClick={() => setApproveOpenId(null)}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={approveMutation.isPending}
                  className="rounded-xl px-4 py-2 text-xs font-extrabold transition hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: BRAND_YELLOW, color: BRAND_DARK }}
                  onClick={() => handleConfirmApprove(approveOpenId)}
                >
                  {approveMutation.isPending ? "Aprovando..." : "Sim, aprovar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Modal Editar */}
        {editOpenId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={handleCloseEdit}
          >
            <div
              className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div className="min-w-0">
                  <div
                    className="text-sm font-extrabold"
                    style={{ color: BRAND_DARK }}
                  >
                    Editar variação
                  </div>
                  <div className="mt-0.5 truncate text-xs text-gray-500">
                    Atualize a descrição e salve.
                  </div>
                </div>

                <button
                  type="button"
                  disabled={editMutation.isPending}
                  className="cursor-pointer rounded-xl px-3 py-2 text-xs font-extrabold transition hover:bg-gray-100 disabled:opacity-50"
                  style={{ color: BRAND_DARK }}
                  onClick={handleCloseEdit}
                >
                  Fechar
                </button>
              </div>

              {/* Body */}
              <div className="p-5">
                {(() => {
                  const v = variations.find((x) => x.id === editOpenId);
                  if (!v) return null;

                  return (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Carousel */}
                      <div className="rounded-2xl border bg-white p-3">
                        <div
                          className="text-xs font-extrabold mb-2"
                          style={{ color: BRAND_DARK }}
                        >
                          Fotos
                        </div>

                        <ItemImageCarousel
                          images={v.images_url}
                          alt={"Imagem da variação"}
                          size={220}
                        />

                        {v.item?.slug ? (
                          <div className="mt-3 text-xs text-gray-500 truncate">
                            Item:{" "}
                            <b style={{ color: BRAND_DARK }}>{v.item.slug}</b>
                          </div>
                        ) : null}
                      </div>

                      {/* Form */}
                      <div className="rounded-2xl border bg-white p-3">
                        <div
                          className="text-xs font-extrabold mb-2"
                          style={{ color: BRAND_DARK }}
                        >
                          Descrição
                        </div>

                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={8}
                          className="w-full rounded-xl border bg-white p-3 text-sm text-gray-800 outline-none focus:ring-2"
                          style={{
                            borderColor: "rgba(0,0,0,0.12)",
                          }}
                          placeholder="Escreva a descrição da variação…"
                          disabled={editMutation.isPending}
                        />

                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {editDescription.trim().length} caracteres
                          </span>

                          {editMutation.isPending ? (
                            <span className="text-gray-400">Salvando…</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
                <button
                  type="button"
                  disabled={editMutation.isPending}
                  className="rounded-xl border px-4 py-2 text-xs font-extrabold disabled:opacity-50"
                  style={{ color: BRAND_DARK, borderColor: "rgba(0,0,0,0.12)" }}
                  onClick={handleCloseEdit}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={editMutation.isPending}
                  className="rounded-xl px-4 py-2 text-xs font-extrabold transition hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: BRAND_YELLOW, color: BRAND_DARK }}
                  onClick={handleConfirmEdit}
                >
                  {editMutation.isPending ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Excluir Variação */}
        {delVarOpen && delVar && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() =>
              !deleteMutation.isPending &&
              (setDelVarOpen(false), setDelVar(null))
            }
          >
            <div
              className="w-full max-w-3xl rounded-2xl bg-white shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div className="min-w-0">
                  <div
                    className="text-sm font-extrabold"
                    style={{ color: BRAND_DARK }}
                  >
                    Excluir variação
                  </div>

                  {/* Linha 1: descrição (truncate) */}
                  <div className="mt-0.5 truncate text-xs text-gray-500">
                    {delVar.description}
                  </div>

                  {/* Linha 2: item vinculado (se existir) */}
                  {delVar.item?.slug ? (
                    <div className="mt-0.5 truncate text-xs text-gray-500">
                      Item vinculado:{" "}
                      <b style={{ color: BRAND_DARK }}>{delVar.item.slug}</b>
                    </div>
                  ) : null}
                </div>

                <button
                  className="text-2xl font-bold text-gray-500 hover:text-gray-800"
                  onClick={() =>
                    !deleteMutation.isPending &&
                    (setDelVarOpen(false), setDelVar(null))
                  }
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                {delVarErr && (
                  <div className="mb-4 rounded-xl border bg-white p-3">
                    <div
                      className="text-xs font-semibold"
                      style={{ color: BRAND_DARK }}
                    >
                      Atenção
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      {delVarErr}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
                  {/* Carousel */}
                  <div className="sm:col-span-1">
                    <div className="text-xs font-semibold text-gray-600 mb-2">
                      Fotos da variação
                    </div>

                    <div className="rounded-2xl border bg-gray-50 p-2">
                      <ItemImageCarousel
                        images={delVar.images_url}
                        alt={"Imagem da variação"}
                        size={220}
                        onOpen={(src) => setPreviewImage(src)} // se você quiser reutilizar o preview
                      />
                    </div>
                  </div>

                  {/* Motivo */}
                  <div className="sm:col-span-2">
                    <label
                      className="text-xs font-semibold"
                      style={{ color: BRAND_DARK }}
                    >
                      Motivo (vai no e-mail do usuário)
                    </label>

                    <textarea
                      value={delVarReason}
                      onChange={(e) => setDelVarReason(e.target.value)}
                      className="mt-2 w-full min-h-[180px] rounded-xl border bg-white p-3 text-sm outline-none focus:ring-2"
                      style={{ borderColor: "rgba(0,0,0,0.12)" }}
                      placeholder="Ex: Foto não corresponde à variação / descrição incorreta / variação duplicada..."
                      disabled={deleteMutation.isPending}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t px-5 py-4 border-gray-200">
                <button
                  disabled={deleteMutation.isPending}
                  onClick={() => (setDelVarOpen(false), setDelVar(null))}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  disabled={deleteMutation.isPending}
                  onClick={handleConfirmDeleteVariation}
                  className="rounded-xl px-4 py-2 text-sm font-extrabold disabled:opacity-50 border"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.12)",
                    color: "#B91C1C",
                    borderColor: "rgba(185,28,28,0.35)",
                  }}
                >
                  {deleteMutation.isPending
                    ? "Excluindo..."
                    : "Excluir e enviar motivo"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
