"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import TopMenu from "../components/TopMenu";

import Image from "next/image";

import axios, { AxiosError } from "axios";

import Cropper from "react-easy-crop";

import { getCroppedImageBlob, blobToFile } from "@/app/lib/crop";

import type { CropArea, CropAreaPixels, IItemStatsData } from "@/app/lib/types";

import {
  useQuery,
  keepPreviousData,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";

import {
  fetchAdminTickets,
  closeAdminTicket,
  uploadAdminImageSuggestion,
  answerAdminTicket,
  patchAdminItem,
  uploadAdminItemImage,
} from "@/app/lib/endpoints";

import type {
  IStatsTicketsPaginate,
  AdminItemPatchPayload,
  EditForm,
} from "@/app/lib/types";

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

const INFO_LABELS: Record<
  "info1" | "info2" | "info3" | "info4" | "info5",
  string
> = {
  info1: "Time / Seleção",
  info2: "Marca",
  info3: "País",
  info4: "Modelo",
  info5: "Esporte",
};

const INFO4_OPTIONS = [
  { label: "Titular", value: "titular" },
  { label: "Reserva", value: "reserva" },
  { label: "Terceira Camisa", value: "terceira" },
  { label: "Quarta Camisa", value: "quarta" },
  { label: "Goleiro", value: "goleiro" },
  { label: "Treino", value: "treino" },
  { label: "Pré-Jogo", value: "prejogo" },
  { label: "Relançamento", value: "relancamento" },
  { label: "Edição Especial", value: "especial" },
  { label: "Comemorativa", value: "comemorativa" },
] as const;

export default function ContributionTicketsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [guardLoading, setGuardLoading] = useState(true);

  const [openItemForTicketId, setOpenItemForTicketId] = useState<string | null>(
    null,
  );

  const [imgTicketType, setImgTicketType] = useState<string | null>(null);

  const [days, setDays] = useState<number>(7);
  const [page, setPage] = useState<number>(1);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [closeTicketId, setCloseTicketId] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);

  // Modal trocar imagem (igual Items)
  const [imgOpen, setImgOpen] = useState(false);
  const [imgItem, setImgItem] = useState<IItemStatsData | null>(null);
  const [imgTicketId, setImgTicketId] = useState<string | null>(null);

  const [credits, setCredits] = useState("");

  const [reason, setReason] = useState<
    "" | "out_standard_image" | "wrong_image"
  >("");

  const [newImageSrc, setNewImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<CropAreaPixels | null>(null);

  const CROP_W = 800;
  const CROP_H = 1100;
  const CROP_ASPECT = CROP_W / CROP_H; // 8/11

  const fileInputId = "admin-ticket-change-image-input";

  const [savingImage, setSavingImage] = useState(false);
  const [imageErr, setImageErr] = useState<string | null>(null);

  // Modal responder ticket
  const [answerOpen, setAnswerOpen] = useState(false);
  const [answerTicket, setAnswerTicket] = useState<{
    id: string;
    description: string | null;
  } | null>(null);

  const [answerText, setAnswerText] = useState("");
  const [answerErr, setAnswerErr] = useState<string | null>(null);

  // Modal de edição (igual Items)
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<IItemStatsData | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    object: "",
    info1: "",
    info2: "",
    info3: "",
    info4: "",
    info5: "",
    year: "",
    year2: "",
    contributor: "",
  });

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

  // Reset page quando muda período
  useEffect(() => {
    setPage(1);
  }, [days]);

  // Query: lista paginada
  const ticketsQuery = useQuery({
    queryKey: ["admin-tickets", days, page],
    queryFn: () => fetchAdminTickets(days, page),
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

  const closeTicketMutation = useMutation({
    mutationFn: (id: string) => closeAdminTicket(id),
    onSuccess: async () => {
      setCloseTicketId(null);
      setCloseError(null);

      // mantém o padrão do React Query: invalida a lista
      await queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
    onError: (err) => {
      const status = getAxiosStatus(err);
      alert(status ? `Erro (${status}).` : "Falha de rede.");
    },
  });

  const answerTicketMutation = useMutation({
    mutationFn: (vars: { id: string; answer: string }) =>
      answerAdminTicket(vars.id, vars.answer),

    onSuccess: async (result) => {
      // atualiza cache da página atual (igual sua troca de imagem)
      queryClient.setQueryData<IStatsTicketsPaginate>(
        ["admin-tickets", days, page],
        (old) => {
          if (!old) return old;

          return {
            ...old,
            data: old.data.map((row) => {
              if (row.ticket.id !== result.ticket.id) return row;

              return {
                ...row,
                ticket: result.ticket,
                item: result.item ?? row.item,
              };
            }),
          };
        },
      );

      closeAnswerModal();
    },

    onError: (err) => {
      const status = getAxiosStatus(err);
      alert(status ? `Erro (${status}).` : "Falha de rede.");
    },
  });

  const editMutation = useMutation({
    mutationFn: async (vars: {
      id: string;
      payload: AdminItemPatchPayload;
    }) => {
      await patchAdminItem(vars.id, vars.payload);
    },
    onSuccess: async () => {
      // mantém igual ao Items: invalida a lista de tickets (ou você pode setQueryData se quiser)
      await queryClient.invalidateQueries({
        queryKey: ["admin-tickets"],
      });

      setEditOpen(false);
      setEditItem(null);
    },
    onError: (err) => {
      const msg = getErrorMessage(err);
      alert(msg);
    },
  });

  if (guardLoading) return null;

  const resp: IStatsTicketsPaginate | null = ticketsQuery.data ?? null;

  const tickets = resp?.data ?? [];
  const total = resp?.total ?? 0;
  const from = resp?.from ?? 0;
  const to = resp?.to ?? 0;
  const perPage = resp?.per_page ?? 0;
  const currentPage = resp?.current_page ?? page;

  const hasPrev = resp?.prev_page !== null && resp?.prev_page !== undefined;
  const hasNext = resp?.next_page !== null && resp?.next_page !== undefined;

  const loading = ticketsQuery.isLoading || ticketsQuery.isFetching;
  const queryErrMsg = ticketsQuery.error
    ? getErrorMessage(ticketsQuery.error)
    : null;

  const errorMsg =
    queryErrMsg === "NO_BASEURL"
      ? "NEXT_PUBLIC_API_URL não está definido no admin."
      : ticketsQuery.isError
        ? "Falha ao carregar tickets."
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

  function openCloseTicketModal(ticketId: string) {
    setCloseError(null);
    setCloseTicketId(ticketId);
  }

  function confirmCloseTicket() {
    if (!closeTicketId) return;
    closeTicketMutation.mutate(closeTicketId);
  }

  async function handlePickNewImage(file?: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageErr("Selecione um arquivo de imagem.");
      return;
    }

    setImageErr(null);

    const reader = new FileReader();
    reader.onload = () => setNewImageSrc(String(reader.result));
    reader.onerror = () => setImageErr("Falha ao ler a imagem.");
    reader.readAsDataURL(file);
  }

  function onCropComplete(
    croppedArea: CropArea,
    croppedAreaPixels: CropAreaPixels,
  ) {
    setCroppedAreaPixels(croppedAreaPixels);
  }

  function handleChangeItemImage(
    ticketId: string,
    ticketType: string | null | undefined,
    item?: IItemStatsData | null,
  ) {
    if (!item) return;

    setImgTicketId(ticketId);
    setImgTicketType(
      ticketType ? String(ticketType).trim().toUpperCase() : null,
    );
    setImgItem(item);
    setNewImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setImageErr(null);
    setCredits("");
    setReason("");

    setImgOpen(true);
  }

  function openAnswerModal(t: { id: string; description: string | null }) {
    setAnswerErr(null);
    setAnswerText("");
    setAnswerTicket({ id: t.id, description: t.description ?? null });
    setAnswerOpen(true);
  }

  function closeAnswerModal() {
    setAnswerOpen(false);
    setAnswerTicket(null);
    setAnswerText("");
    setAnswerErr(null);
  }

  function confirmAnswerTicket() {
    if (!answerTicket?.id) return;

    const a = answerText.trim();
    if (!a) {
      setAnswerErr("Escreva uma resposta antes de enviar.");
      return;
    }

    answerTicketMutation.mutate({ id: answerTicket.id, answer: a });
  }

  async function handleSaveNewImage() {
    if (!imgItem || !imgTicketId) return;

    if (!newImageSrc) {
      setImageErr("Selecione uma imagem.");
      return;
    }

    if (!croppedAreaPixels) {
      setImageErr("Ajuste o recorte antes de salvar.");
      return;
    }

    if (!reason) {
      setImageErr("Selecione um motivo (fora do padrão ou foto errada).");
      return;
    }

    const c = credits.trim();
    if (!c) {
      setImageErr("Informe os créditos da imagem.");
      return;
    }

    setSavingImage(true);
    setImageErr(null);

    try {
      const blob = await getCroppedImageBlob(
        newImageSrc,
        croppedAreaPixels,
        CROP_W,
        CROP_H,
        "image/jpeg",
        0.92,
      );

      const file = blobToFile(blob, `${imgItem.id}.jpg`);

      if (imgTicketType === "REPORT") {
        await uploadAdminItemImage(imgItem.id, file, c, reason);

        // ARRUMAR - como esse endpoint não retorna ticket, seguimos seu padrão de invalidar
        await queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      } else {
        const result = await uploadAdminImageSuggestion(
          imgTicketId,
          file,
          c,
          reason,
        );

        queryClient.setQueryData<IStatsTicketsPaginate>(
          ["admin-tickets", days, page],
          (old) => {
            if (!old) return old;

            return {
              ...old,
              data: old.data.map((row) => {
                if (row.ticket.id !== result.ticket.id) return row;
                return {
                  ...row,
                  ticket: result.ticket,
                  item: result.item ?? row.item,
                };
              }),
            };
          },
        );
      }

      setImgOpen(false);
      setImgItem(null);
      setImgTicketId(null);
      setImgTicketType(null);
    } catch (err) {
      const status = getAxiosStatus(err);
      console.log(err);
      setImageErr(status ? `Erro ao salvar (${status}).` : "Falha ao salvar.");
    } finally {
      setSavingImage(false);
    }
  }

  function handleOpenEdit(it: IItemStatsData) {
    setEditItem(it);
    setEditForm({
      object: it.object ?? "",
      info1: it.info1 ?? "",
      info2: it.info2 ?? "",
      info3: it.info3 ?? "",
      info4: it.info4 ?? "",
      info5: it.info5 ?? "",
      year: it.year ? String(it.year) : "",
      year2: it.year2 ? String(it.year2) : "",
      contributor: it.contributor ?? "",
    });
    setEditOpen(true);
  }

  function buildPatchPayloadFromForm(form: EditForm): AdminItemPatchPayload {
    const payload: AdminItemPatchPayload = {};

    const obj = form.object.trim();
    const info1 = form.info1.trim();
    const info2 = form.info2.trim();
    const info3 = form.info3.trim();
    const info4 = form.info4.trim();
    const info5 = form.info5.trim();
    const contributor = form.contributor.trim();
    const yearStr = form.year.trim();
    const year2Str = form.year2.trim();

    if (obj) payload.object = obj;
    if (info1) payload.info1 = info1;
    if (info2) payload.info2 = info2;
    if (info3) payload.info3 = info3;
    if (info4) payload.info4 = info4;
    if (info5) payload.info5 = info5;

    if (contributor) payload.contributor = contributor;

    if (yearStr) {
      const y = Number(yearStr);
      if (!Number.isNaN(y)) payload.year = y;
    }

    if (year2Str === "") {
      payload.year2 = null;
    } else {
      const y2 = Number(year2Str);
      if (!Number.isNaN(y2)) payload.year2 = y2;
    }

    return payload;
  }

  function handleSaveEdit() {
    if (!editItem) return;

    const payload = buildPatchPayloadFromForm(editForm);

    if (Object.keys(payload).length === 0) {
      setEditOpen(false);
      setEditItem(null);
      return;
    }

    editMutation.mutate({ id: editItem.id, payload });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopMenu />

      <main className="flex-1">
        {/* Header */}
        <section className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1
                  className="text-2xl sm:text-3xl font-extrabold"
                  style={{ color: BRAND_DARK }}
                >
                  Tickets dos usuários
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
                  Tickets criados no período selecionado
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

        {/* Content */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-gray-700">
              {loading ? (
                <>Carregando tickets…</>
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
                className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: BRAND_YELLOW, color: BRAND_DARK }}
                onClick={() => ticketsQuery.refetch()}
                disabled={loading}
              >
                Tentar novamente
              </button>
            </div>
          ) : loading && !resp ? (
            <div className="mt-4 grid gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[82px] rounded-2xl bg-gray-200 animate-pulse"
                />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="mt-4 rounded-2xl border bg-white p-6 shadow-sm">
              <div
                className="text-sm font-semibold"
                style={{ color: BRAND_DARK }}
              >
                Nenhum ticket encontrado
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Não há tickets nos últimos {days} {days === 1 ? "dia" : "dias"}.
              </div>
            </div>
          ) : (
            <>
              <div className="mt-4 overflow-hidden rounded-2xl border bg-white shadow-sm">
                {/* Header da “tabela” */}
                <div className="grid grid-cols-[minmax(0,1fr)_140px_120px_170px_220px] items-center gap-3 border-b bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
                  <div>Ticket</div>
                  <div>Status</div>
                  <div>Imagens</div>
                  <div>Criado</div>
                  <div>Ações</div>
                </div>

                <ul className="divide-y">
                  {(resp?.data ?? []).map((row) => {
                    const t = row.ticket;
                    const item = row.item;

                    const ticketImage = t.images_url?.[0] ?? null;
                    const itemImage = item?.images_url?.[0] ?? null;

                    let img: string | null = null;

                    if (t.status === "resolved") {
                      img = itemImage ?? ticketImage;
                    } else {
                      img = ticketImage ?? itemImage;
                    }

                    return (
                      <li key={t.id} className="px-4 py-4">
                        <div className="grid grid-cols-[minmax(0,1fr)_140px_120px_170px_220px] items-center gap-3 px-4 py-4">
                          {/* Ticket */}
                          <div className="min-w-0">
                            <div
                              className="truncate text-[13px] font-medium"
                              style={{ color: BRAND_DARK }}
                              title={t.description}
                            >
                              {t.type?.toUpperCase()}
                            </div>

                            <div className="mt-0.5 text-xs text-gray-500 whitespace-pre-wrap break-words">
                              {t.id}
                            </div>

                            <div className="mt-0.5 text-xs text-gray-500 whitespace-pre-wrap break-words">
                              {t.description}
                            </div>

                            <div className="mt-2 truncate text-xs text-gray-500">
                              Autor: {t.author ? ` ${t.author}` : ""}
                            </div>

                            {/* Botão: Ver item */}
                            {item ? (
                              <div className="mt-4">
                                <button
                                  type="button"
                                  className="cursor-pointer inline-flex items-center rounded-xl px-3 py-1.5 text-[11px] font-extrabold transition hover:opacity-90"
                                  style={{
                                    backgroundColor: "rgba(244,200,46)",
                                    color: BRAND_DARK,
                                  }}
                                  onClick={() => setOpenItemForTicketId(t.id)}
                                  title={
                                    item.slug
                                      ? `Ver item: ${item.slug}`
                                      : "Ver item vinculado"
                                  }
                                >
                                  Ver item vinculado
                                </button>
                              </div>
                            ) : null}

                            {/* Modal: Item vinculado ao ticket */}
                            {item && openItemForTicketId === t.id ? (
                              <div
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                                onClick={() => setOpenItemForTicketId(null)}
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
                                        {item.object || "Item"}{" "}
                                        {item.slug ? `• ${item.slug}` : ""}
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      className="cursor-pointer rounded-xl px-3 py-2 text-xs font-extrabold transition hover:bg-gray-100"
                                      style={{ color: BRAND_DARK }}
                                      onClick={() =>
                                        setOpenItemForTicketId(null)
                                      }
                                    >
                                      Fechar
                                    </button>
                                  </div>

                                  {/* Body */}
                                  <div className="p-5">
                                    <div className="flex gap-4">
                                      {/* Imagem */}
                                      <div className="relative w-28 aspect-[8/11] flex-none overflow-hidden rounded-2xl bg-gray-100">
                                        {item.images_url?.[0] ? (
                                          <Image
                                            src={item.images_url[0]}
                                            alt={item.object || "Item"}
                                            fill
                                            className="object-cover"
                                            sizes="112px"
                                          />
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                                            Sem foto
                                          </div>
                                        )}
                                      </div>

                                      {/* Infos */}
                                      <div className="min-w-0 flex-1 text-xs text-gray-700 space-y-1">
                                        {item.info1 && (
                                          <div>
                                            <b>Info1:</b> {item.info1}
                                          </div>
                                        )}
                                        {item.info2 && (
                                          <div>
                                            <b>Info2:</b> {item.info2}
                                          </div>
                                        )}
                                        {item.info3 && (
                                          <div>
                                            <b>Info3:</b> {item.info3}
                                          </div>
                                        )}
                                        {item.info4 && (
                                          <div>
                                            <b>Info4:</b> {item.info4}
                                          </div>
                                        )}
                                        {item.info5 && (
                                          <div>
                                            <b>Info5:</b> {item.info5}
                                          </div>
                                        )}
                                        {item.year && (
                                          <div>
                                            <b>Ano:</b> {item.year}
                                          </div>
                                        )}
                                        {item.slug && (
                                          <div className="text-gray-700">
                                            <b>Slug:</b> {item.slug}
                                          </div>
                                        )}
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
                                        setOpenItemForTicketId(null)
                                      }
                                    >
                                      OK
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          {/* Status */}
                          <div className="min-w-0">
                            <span
                              className="inline-flex max-w-full items-center truncate rounded-full px-2.5 py-1 text-xs font-semibold"
                              style={{
                                backgroundColor: "rgba(244,200,46,0.25)",
                                color: BRAND_DARK,
                              }}
                              title={t.status}
                            >
                              {t.status}
                            </span>
                          </div>

                          {/* Imagens */}
                          <div className="flex items-center">
                            <div
                              className="relative h-20 w-20 shrink-0 rounded-2xl overflow-hidden border bg-gray-100 cursor-pointer hover:opacity-90 transition"
                              onClick={() => img && setPreviewImage(img)}
                              title={img ? "Ver imagem" : "Sem imagem"}
                            >
                              {img ? (
                                <Image
                                  src={img}
                                  alt="Imagem do ticket"
                                  fill
                                  sizes="80px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                                  Sem imagem
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Criado em */}
                          <div className="text-xs text-gray-600">
                            {formatDateTime(t.created_at)}
                          </div>

                          {/* Ações */}
                          <div className="flex flex-wrap items-start gap-2">
                            {(() => {
                              const typeNorm = String(t.type ?? "")
                                .trim()
                                .toUpperCase();

                              const statusNorm = String(t.status ?? "")
                                .trim()
                                .toUpperCase();

                              const isResolved = statusNorm === "RESOLVED";

                              const isReport = typeNorm === "REPORT";
                              const isImages = typeNorm === "IMAGES";

                              // ✅ Se estiver resolvido, não renderiza nada
                              if (isResolved) return null;

                              return (
                                <>
                                  {/* Encerrar — NÃO aparece em REPORT */}
                                  {!isReport && (
                                    <button
                                      className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition"
                                      style={{
                                        backgroundColor: BRAND_YELLOW,
                                        color: BRAND_DARK,
                                      }}
                                      onClick={() => openCloseTicketModal(t.id)}
                                    >
                                      Encerrar
                                    </button>
                                  )}

                                  {/* Responder — NÃO aparece em IMAGES */}
                                  {!isImages && (
                                    <button
                                      className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition"
                                      style={{
                                        backgroundColor: BRAND_YELLOW,
                                        color: BRAND_DARK,
                                      }}
                                      onClick={() =>
                                        openAnswerModal({
                                          id: t.id,
                                          description: t.description ?? null,
                                        })
                                      }
                                    >
                                      Responder
                                    </button>
                                  )}

                                  {/* Trocar imagem — REPORT e IMAGES */}
                                  {(isReport || isImages) && (
                                    <button
                                      className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition disabled:opacity-50"
                                      style={{
                                        backgroundColor: BRAND_YELLOW,
                                        color: BRAND_DARK,
                                      }}
                                      onClick={() =>
                                        handleChangeItemImage(
                                          t.id,
                                          t.type,
                                          item,
                                        )
                                      }
                                      disabled={!t.item_id}
                                    >
                                      Trocar imagem
                                    </button>
                                  )}

                                  {/* Editar item — só REPORT */}
                                  {isReport && (
                                    <button
                                      className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition disabled:opacity-50"
                                      style={{
                                        backgroundColor: BRAND_YELLOW,
                                        color: BRAND_DARK,
                                      }}
                                      disabled={!item}
                                      onClick={() =>
                                        item && handleOpenEdit(item)
                                      }
                                    >
                                      Editar item
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-6 flex justify-end">
                <Pagination />
              </div>
            </>
          )}
        </section>

        {/* Modal Preview */}
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

        {/* Modal: Confirmar Encerrar Ticket */}
        {closeTicketId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() =>
              !closeTicketMutation.isPending && setCloseTicketId(null)
            }
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-gray-200 px-5 py-4">
                <div
                  className="text-sm font-extrabold"
                  style={{ color: BRAND_DARK }}
                >
                  Finalizar ticket
                </div>

                <div className="mt-1 text-xs text-gray-600">
                  Esta ação marcará o ticket como resolvido.
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4">
                {closeError && (
                  <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {closeError}
                  </div>
                )}

                <div className="text-sm text-gray-700">
                  Tem certeza que deseja finalizar este ticket?
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-xs font-extrabold transition hover:bg-gray-100 disabled:opacity-50"
                  style={{ color: BRAND_DARK }}
                  onClick={() => setCloseTicketId(null)}
                  disabled={closeTicketMutation.isPending}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-xs font-extrabold transition disabled:opacity-50"
                  style={{
                    backgroundColor: BRAND_YELLOW,
                    color: BRAND_DARK,
                  }}
                  onClick={confirmCloseTicket}
                  disabled={closeTicketMutation.isPending}
                >
                  {closeTicketMutation.isPending
                    ? "Finalizando..."
                    : "Finalizar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Mudar imagem (Tickets) */}
        {imgOpen && imgItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() =>
              !savingImage && (setImgOpen(false), setImgItem(null))
            }
          >
            <div
              className="w-full max-w-6xl rounded-2xl bg-white shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div className="min-w-0">
                  <div
                    className="text-sm font-extrabold"
                    style={{ color: BRAND_DARK }}
                  >
                    Mudar imagem
                  </div>
                  <div className="mt-0.5 truncate text-xs text-gray-500">
                    {imgItem.slug}
                  </div>
                </div>

                <button
                  className="text-2xl font-bold text-gray-500 hover:text-gray-800"
                  onClick={() =>
                    !savingImage && (setImgOpen(false), setImgItem(null))
                  }
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              <div className="p-5">
                {imageErr && (
                  <div className="mb-4 rounded-xl border bg-white p-3">
                    <div
                      className="text-xs font-semibold"
                      style={{ color: BRAND_DARK }}
                    >
                      Atenção
                    </div>
                    <div className="mt-1 text-xs text-gray-600">{imageErr}</div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                  {/* Antiga */}
                  <div className="rounded-2xl border bg-gray-50 p-4 w-full max-w-[clamp(220px,26vw,300px)] mx-auto">
                    <div className="text-xs font-semibold text-gray-600 mb-3">
                      Imagem atual
                    </div>

                    <div className="relative w-full aspect-[8/11] rounded-2xl overflow-hidden border bg-white">
                      {imgItem.images_url?.[0] ? (
                        <Image
                          src={imgItem.images_url[0]}
                          alt="Imagem atual"
                          fill
                          sizes="(max-width: 1024px) 100vw, 33vw"
                          className="object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                          Sem imagem
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Coluna central */}
                  <div className="hidden lg:flex flex-col items-center justify-start h-full pt-10 gap-6">
                    <div
                      className="rounded-full px-4 py-2 text-sm font-extrabold"
                      style={{
                        backgroundColor: "rgba(244,200,46,0.25)",
                        color: BRAND_DARK,
                      }}
                    >
                      ➜
                    </div>

                    <div className="w-full max-w-[200px] rounded-2xl border bg-white p-4 shadow-sm">
                      <div
                        className="text-xs font-semibold mb-3 text-center"
                        style={{ color: BRAND_DARK }}
                      >
                        Motivo
                      </div>

                      <div className="flex flex-col gap-3 text-sm text-gray-700">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={reason === "out_standard_image"}
                            disabled={savingImage || reason === "wrong_image"}
                            onChange={() =>
                              setReason((prev) =>
                                prev === "out_standard_image"
                                  ? ""
                                  : "out_standard_image",
                              )
                            }
                          />
                          Foto fora do padrão
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={reason === "wrong_image"}
                            disabled={
                              savingImage || reason === "out_standard_image"
                            }
                            onChange={() =>
                              setReason((prev) =>
                                prev === "wrong_image" ? "" : "wrong_image",
                              )
                            }
                          />
                          Foto errada
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Input file */}
                  <input
                    id={fileInputId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePickNewImage(e.target.files?.[0])}
                    disabled={savingImage}
                  />

                  {/* Nova (crop) */}
                  <div className="rounded-2xl border bg-white p-4 w-full max-w-[clamp(220px,26vw,300px)] mx-auto">
                    <div className="relative w-full aspect-[8/11] rounded-2xl overflow-hidden border bg-gray-100">
                      {newImageSrc ? (
                        <>
                          <Cropper
                            image={newImageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={CROP_ASPECT}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                            restrictPosition={false}
                          />

                          <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-white/90 border p-3">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-gray-600">
                                Zoom
                              </span>
                              <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.01}
                                value={zoom}
                                onChange={(e) =>
                                  setZoom(Number(e.target.value))
                                }
                                className="w-full"
                                disabled={savingImage}
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <label
                          htmlFor={fileInputId}
                          className="flex h-full w-full cursor-pointer items-center justify-center p-6 text-center"
                        >
                          <div className="rounded-2xl border bg-white px-5 py-4 shadow-sm">
                            <div
                              className="text-sm font-semibold"
                              style={{ color: BRAND_DARK }}
                            >
                              Selecionar uma imagem para recortar
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              Clique aqui para escolher do computador
                            </div>
                            <div
                              className="mt-3 inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold"
                              style={{
                                backgroundColor: BRAND_YELLOW,
                                color: BRAND_DARK,
                              }}
                            >
                              Abrir arquivos
                            </div>
                          </div>
                        </label>
                      )}
                    </div>

                    <div className="mb-3 mt-3">
                      <label
                        className="text-xs font-semibold"
                        style={{ color: BRAND_DARK }}
                      >
                        Créditos da imagem
                      </label>

                      <input
                        value={credits}
                        onChange={(e) => setCredits(e.target.value)}
                        placeholder="Nome do site"
                        className="mt-1 w-full h-10 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2"
                        style={{ borderColor: "rgba(0,0,0,0.12)" }}
                        disabled={savingImage}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t px-5 py-4 border-gray-200">
                <button
                  disabled={savingImage}
                  onClick={() => (setImgOpen(false), setImgItem(null))}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  disabled={savingImage || !newImageSrc || !reason}
                  onClick={handleSaveNewImage}
                  className="rounded-xl px-4 py-2 text-sm font-extrabold disabled:opacity-50"
                  style={{ backgroundColor: BRAND_DARK, color: "white" }}
                >
                  {savingImage ? "Salvando..." : "Salvar imagem"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Responder Ticket */}
        {answerOpen && answerTicket && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() =>
              !answerTicketMutation.isPending && closeAnswerModal()
            }
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-gray-200 px-5 py-4">
                <div
                  className="text-sm font-extrabold"
                  style={{ color: BRAND_DARK }}
                >
                  Responder ticket
                </div>

                <div className="mt-1 text-xs text-gray-600">
                  A resposta será enviada ao usuário por e-mail.
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-4">
                {answerErr && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {answerErr}
                  </div>
                )}

                <div className="rounded-2xl border bg-gray-50 p-3">
                  <div className="text-[11px] font-semibold text-gray-600">
                    Descrição do ticket
                  </div>
                  <div className="mt-1 text-xs text-gray-700 whitespace-pre-wrap break-words">
                    {answerTicket.description || "-"}
                  </div>
                </div>

                <div>
                  <label
                    className="text-xs font-semibold"
                    style={{ color: BRAND_DARK }}
                  >
                    Sua resposta
                  </label>

                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Escreva aqui a resposta que o usuário vai receber por e-mail..."
                    className="mt-1 w-full min-h-[120px] rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2"
                    style={{ borderColor: "rgba(0,0,0,0.12)" }}
                    disabled={answerTicketMutation.isPending}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-xs font-extrabold transition hover:bg-gray-100 disabled:opacity-50"
                  style={{ color: BRAND_DARK }}
                  onClick={closeAnswerModal}
                  disabled={answerTicketMutation.isPending}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-xs font-extrabold transition disabled:opacity-50"
                  style={{ backgroundColor: BRAND_DARK, color: "white" }}
                  onClick={confirmAnswerTicket}
                  disabled={answerTicketMutation.isPending}
                >
                  {answerTicketMutation.isPending ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Editar (igual Items) */}
        {editOpen && editItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() =>
              !editMutation.isPending && (setEditOpen(false), setEditItem(null))
            }
          >
            <div
              className="w-full max-w-5xl rounded-2xl bg-white shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col md:flex-row">
                {/* Coluna imagem */}
                <div className="md:w-2/5 bg-gray-50 border-b md:border-b-0 md:border-r p-4 sm:p-6 border-gray-200">
                  <div className="text-sm font-semibold text-gray-600 mb-3">
                    Imagem do item
                  </div>

                  {editItem.images_url?.[0] ? (
                    <div className="relative w-full h-[280px] sm:h-[360px] rounded-2xl overflow-hidden border border-gray-200">
                      <Image
                        src={editItem.images_url[0]}
                        alt={editItem.object ?? "Imagem do item"}
                        fill
                        sizes="(max-width: 768px) 100vw, 40vw"
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-[280px] sm:h-[360px] rounded-2xl border bg-white flex items-center justify-center text-sm text-gray-500">
                      Sem imagem
                    </div>
                  )}
                </div>

                {/* Coluna formulário */}
                <div className="md:w-3/5 flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                    <div className="min-w-0">
                      <div
                        className="text-sm font-extrabold"
                        style={{ color: BRAND_DARK }}
                      >
                        Editar item
                      </div>
                      <div className="mt-0.5 truncate text-xs text-gray-500">
                        {editItem.object}{" "}
                        {editItem.info1 ? `• ${editItem.info1}` : ""}{" "}
                        {editItem.year ? `• ${editItem.year}` : ""}
                      </div>
                    </div>

                    <button
                      className="text-2xl font-bold text-gray-500 hover:text-gray-800"
                      onClick={() =>
                        !editMutation.isPending &&
                        (setEditOpen(false), setEditItem(null))
                      }
                      aria-label="Fechar"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Body */}
                  <div className="max-h-[70vh] overflow-auto px-5 py-5">
                    {editMutation.isError && (
                      <div className="mb-4 rounded-xl border bg-white p-3">
                        <div
                          className="text-xs font-semibold"
                          style={{ color: BRAND_DARK }}
                        >
                          Não foi possível salvar
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          {(() => {
                            const status = getAxiosStatus(editMutation.error);
                            if (status) return `Erro ao salvar (${status}).`;
                            return "Falha de rede ao salvar.";
                          })()}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(
                        ["info1", "info2", "info3", "info4", "info5"] as const
                      ).map((k) => (
                        <div
                          key={k}
                          className={k === "info1" ? "sm:col-span-2" : ""}
                        >
                          <label
                            className="text-xs font-semibold"
                            style={{ color: BRAND_DARK }}
                          >
                            {INFO_LABELS[k]}
                          </label>

                          {k === "info4" ? (
                            <select
                              value={editForm.info4}
                              onChange={(e) =>
                                setEditForm((p) => ({
                                  ...p,
                                  info4: e.target.value,
                                }))
                              }
                              className="mt-1 w-full h-10 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 appearance-none"
                              style={{ borderColor: "rgba(0,0,0,0.12)" }}
                            >
                              <option value="">Selecione</option>
                              {INFO4_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={editForm[k]}
                              onChange={(e) =>
                                setEditForm((p) => ({
                                  ...p,
                                  [k]: e.target.value,
                                }))
                              }
                              className="mt-1 w-full h-10 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2"
                              style={{ borderColor: "rgba(0,0,0,0.12)" }}
                            />
                          )}
                        </div>
                      ))}

                      <div>
                        <label
                          className="text-xs font-semibold"
                          style={{ color: BRAND_DARK }}
                        >
                          Ano
                        </label>
                        <input
                          value={editForm.year}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, year: e.target.value }))
                          }
                          inputMode="numeric"
                          className="mt-1 w-full h-10 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2"
                          style={{ borderColor: "rgba(0,0,0,0.12)" }}
                          placeholder="1999"
                        />
                      </div>

                      <div>
                        <label
                          className="text-xs font-semibold"
                          style={{ color: BRAND_DARK }}
                        >
                          Ano 2 (opcional)
                        </label>
                        <input
                          value={editForm.year2}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              year2: e.target.value,
                            }))
                          }
                          inputMode="numeric"
                          className="mt-1 w-full h-10 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2"
                          style={{ borderColor: "rgba(0,0,0,0.12)" }}
                          placeholder=""
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end gap-2 border-t px-5 py-4 border-gray-200">
                    <button
                      disabled={editMutation.isPending}
                      onClick={() => (setEditOpen(false), setEditItem(null))}
                      className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      Cancelar
                    </button>

                    <button
                      disabled={editMutation.isPending}
                      onClick={handleSaveEdit}
                      className="rounded-xl px-4 py-2 text-sm font-extrabold disabled:opacity-50"
                      style={{ backgroundColor: BRAND_DARK, color: "white" }}
                    >
                      {editMutation.isPending ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
