"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import TopMenu from "../../components/TopMenu";
import ContributionsSubMenu from "../../components/ContributionsSubMenu";

import Image from "next/image";

import axios, { AxiosError } from "axios";

import Cropper from "react-easy-crop";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  fetchAdminItems,
  patchAdminItem,
  uploadAdminItemImage,
  approveAdminItem,
  deleteAdminItem,
} from "../../lib/endpoints";

import { getCroppedImageBlob, blobToFile } from "../../lib/crop";

import {
  AdminItemPatchPayload,
  CropArea,
  CropAreaPixels,
  EditForm,
  IItemStatsData,
  IStatsItemPaginate,
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

export default function ContributionItemsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [guardLoading, setGuardLoading] = useState(true);

  const [days, setDays] = useState<number>(7);
  const [page, setPage] = useState<number>(1);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Modal mudar imagem
  const [imgOpen, setImgOpen] = useState(false);
  const [imgItem, setImgItem] = useState<IItemStatsData | null>(null);

  const [credits, setCredits] = useState("");

  const [reason, setReason] = useState<
    "" | "out_standard_image" | "wrong_image"
  >("");

  const [newImageSrc, setNewImageSrc] = useState<string | null>(null); // preview URL (DataURL)
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<CropAreaPixels | null>(null);

  const CROP_W = 800;
  const CROP_H = 1100;
  const CROP_ASPECT = CROP_W / CROP_H; // 8/11

  const fileInputId = "admin-change-image-input";

  const [savingImage, setSavingImage] = useState(false);
  const [imageErr, setImageErr] = useState<string | null>(null);

  // Modal de edição
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

  // Modal deletar
  const [delOpen, setDelOpen] = useState(false);
  const [delItem, setDelItem] = useState<IItemStatsData | null>(null);
  const [delReason, setDelReason] = useState("");
  const [delErr, setDelErr] = useState<string | null>(null);

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
  const itemsQuery = useQuery({
    queryKey: ["admin-items", days, page],
    queryFn: () => fetchAdminItems(days, page),
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

  // Mutation: salvar edição
  const editMutation = useMutation({
    mutationFn: async (vars: {
      id: string;
      payload: AdminItemPatchPayload;
    }) => {
      await patchAdminItem(vars.id, vars.payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-items", days, page],
      });
      setEditOpen(false);
      setEditItem(null);
    },
    onError: (err) => {
      const status = getAxiosStatus(err);
      alert(status ? `Erro (${status}).` : "Falha de rede.");
    },
  });

  // Mutation: aprovar item
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await approveAdminItem(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-items", days, page],
      });
    },
    onError: (err) => {
      const status = getAxiosStatus(err);
      alert(status ? `Erro (${status}).` : "Falha de rede.");
    },
  });

  // Mutation: excluir item
  const deleteMutation = useMutation({
    mutationFn: async (vars: { id: string; reason: string }) => {
      await deleteAdminItem(vars.id, vars.reason);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-items", days, page],
      });

      setDelOpen(false);
      setDelItem(null);
      setDelReason("");
      setDelErr(null);
    },
    onError: (err) => {
      const status = getAxiosStatus(err);
      alert(status ? `Erro (${status}).` : "Falha de rede.");
    },
  });

  // Modal: abrir editar
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

  async function handlePickNewImage(file?: File | null) {
    if (!file) return;

    // validações rápidas
    if (!file.type.startsWith("image/")) {
      setImageErr("Selecione um arquivo de imagem.");
      return;
    }
    setImageErr(null);

    const reader = new FileReader();
    reader.onload = () => {
      setNewImageSrc(String(reader.result));
    };
    reader.onerror = () => setImageErr("Falha ao ler a imagem.");
    reader.readAsDataURL(file);
  }

  function onCropComplete(
    croppedArea: CropArea,
    croppedAreaPixels: CropAreaPixels,
  ) {
    setCroppedAreaPixels(croppedAreaPixels);
  }

  async function handleSaveNewImage() {
    if (!imgItem) return;

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

      console.log(file);

      await uploadAdminItemImage(imgItem.id, file, c, reason);

      await queryClient.invalidateQueries({
        queryKey: ["admin-items", days, page],
      });

      setImgOpen(false);
      setImgItem(null);
    } catch (err) {
      const status = getAxiosStatus(err);

      setImageErr(status ? `Erro ao salvar (${status}).` : "Falha ao salvar.");
    } finally {
      setSavingImage(false);
    }
  }

  function handleChangeImage(itemId: string) {
    const it = items.find((x) => x.id === itemId);
    if (!it) return;

    setImgItem(it);
    setNewImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setImageErr(null);

    setCredits("");

    setImgOpen(true);
  }

  function handleValidate(itemId: string) {
    const it = items.find((x) => x.id === itemId);
    if (!it) return;

    if (it.approved) return;

    const ok = window.confirm(`Aprovar este item?\n\n${it.slug}`);

    if (!ok) return;

    approveMutation.mutate(itemId);
  }

  function handleDeleteItem(itemId: string) {
    const it = items.find((x) => x.id === itemId);
    if (!it) return;

    setDelItem(it);
    setDelReason("");
    setDelErr(null);
    setDelOpen(true);
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
      payload.year2 = null; // limpa no banco
    } else {
      const y2 = Number(year2Str);
      if (!Number.isNaN(y2)) {
        payload.year2 = y2;
      }
    }

    return payload;
  }

  function handleSaveEdit() {
    if (!editItem) return;

    const payload = buildPatchPayloadFromForm(editForm);

    // Se não mudou nada relevante, você pode só fechar
    if (Object.keys(payload).length === 0) {
      setEditOpen(false);
      setEditItem(null);
      return;
    }

    editMutation.mutate({ id: editItem.id, payload });
  }

  function handleConfirmDelete() {
    if (!delItem) return;

    const reason = delReason.trim();
    if (!reason) {
      setDelErr("Informe o motivo.");
      return;
    }

    deleteMutation.mutate({ id: delItem.id, reason });
  }

  // Derived UI state
  if (guardLoading) return null;

  const resp: IStatsItemPaginate | null = itemsQuery.data ?? null;

  const items = resp?.data ?? [];
  const total = resp?.total ?? 0;
  const from = resp?.from ?? 0;
  const to = resp?.to ?? 0;
  const perPage = resp?.per_page ?? 0;
  const currentPage = resp?.current_page ?? page;

  const hasPrev = resp?.prev_page !== null && resp?.prev_page !== undefined;
  const hasNext = resp?.next_page !== null && resp?.next_page !== undefined;

  const loading = itemsQuery.isLoading || itemsQuery.isFetching;
  const queryErrMsg = itemsQuery.error
    ? getErrorMessage(itemsQuery.error)
    : null;

  const errorMsg =
    queryErrMsg === "NO_BASEURL"
      ? "NEXT_PUBLIC_API_URL não está definido no admin."
      : itemsQuery.isError
        ? "Falha ao carregar itens."
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
                  Contribuições dos usuários
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
                  Itens criados no período selecionado
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
                <>Carregando itens…</>
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
                className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: BRAND_YELLOW, color: BRAND_DARK }}
                onClick={() => itemsQuery.refetch()}
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
                  className="h-[74px] rounded-2xl bg-gray-200 animate-pulse"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="mt-4 rounded-2xl border bg-white p-6 shadow-sm">
              <div
                className="text-sm font-semibold"
                style={{ color: BRAND_DARK }}
              >
                Nenhum item encontrado
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Não há itens nos últimos {days} {days === 1 ? "dia" : "dias"}.
              </div>
            </div>
          ) : (
            <>
              <div className="mt-4 overflow-hidden rounded-2xl border bg-white shadow-sm">
                {/* Header */}
                <div className="grid grid-cols-14 border-b bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
                  <div className="col-span-5">Item</div>
                  <div className="col-span-2">Imagem</div>
                  <div className="col-span-2">Criado em</div>
                  <div className="col-span-5">Ações</div>
                </div>

                <ul className="divide-y">
                  {items.map((it) => (
                    <li key={it.id} className="px-4 py-4">
                      <div className="grid grid-cols-14 items-center gap-3">
                        {/* Item */}
                        <div className="col-span-5 min-w-0">
                          <div
                            className="truncate text-[13px] font-medium"
                            style={{ color: BRAND_DARK }}
                            title={`${it.object ?? ""} ${it.info1 ?? ""} ${it.year ?? ""}`.trim()}
                          >
                            {it.object}
                            {it.info1 ? ` • ${it.info1}` : ""}
                            {it.year ? ` • ${it.year}` : ""}
                            {it.year2 ? `/${it.year2}` : ""}
                          </div>

                          <div className="mt-0.5 truncate text-xs text-gray-500">
                            {it.info2 ? ` ${it.info2}` : ""}
                            {it.info3 ? ` • ${it.info3}` : ""}
                            {it.info4 ? ` • ${it.info4}` : ""}
                            {it.info5 ? ` • ${it.info5}` : ""}
                          </div>

                          <div className="mt-0.5 truncate text-xs text-gray-500">
                            {it.contributor ? ` ${it.contributor}` : ""}
                          </div>

                          <div className="mt-0.5 truncate text-xs text-gray-500">
                            {it.slug ? ` ${it.slug}` : ""}
                          </div>
                        </div>

                        {/* Imagem */}
                        <div className="col-span-2 flex items-center">
                          <div
                            className="relative h-20 w-20 shrink-0 rounded-2xl overflow-hidden border bg-gray-100 cursor-pointer hover:opacity-90 transition"
                            onClick={() =>
                              it.images_url?.[0] &&
                              setPreviewImage(it.images_url[0])
                            }
                            title="Ver imagem"
                          >
                            {it.images_url?.[0] ? (
                              <Image
                                src={it.images_url[0]}
                                alt={it.object ?? "Imagem do item"}
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
                        <div className="col-span-2 text-xs text-gray-600">
                          {formatDateTime(it.created_at)}
                        </div>

                        {/* Ações */}
                        <div className="col-span-4 flex items-center justify-between gap-6">
                          {it.approved ? (
                            <div
                              className="inline-flex items-center rounded-full px-3 py-2 text-xs font-extrabold"
                              style={{
                                backgroundColor: "rgba(34,197,94,0.12)",
                                color: "#166534",
                              }}
                              title="Item já validado"
                            >
                              Aprovado ✓
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  className="cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-50"
                                  style={{
                                    backgroundColor: BRAND_YELLOW,
                                    color: BRAND_DARK,
                                  }}
                                  onClick={() => handleValidate(it.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  {approveMutation.isPending
                                    ? "Aprovando..."
                                    : "Aprovar"}
                                </button>

                                <button
                                  className="cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-50"
                                  style={{
                                    backgroundColor: BRAND_YELLOW,
                                    color: BRAND_DARK,
                                  }}
                                  onClick={() => handleOpenEdit(it)}
                                >
                                  Editar
                                </button>

                                <button
                                  className="cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-50"
                                  style={{
                                    backgroundColor: BRAND_YELLOW,
                                    color: BRAND_DARK,
                                  }}
                                  onClick={() => handleChangeImage(it.id)}
                                >
                                  Mudar imagem
                                </button>
                              </div>

                              <button
                                className="rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-50 border"
                                style={{
                                  backgroundColor: "rgba(239,68,68,0.12)",
                                  color: "#B91C1C",
                                  borderColor: "rgba(185,28,28,0.35)",
                                }}
                                onClick={() => handleDeleteItem(it.id)}
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

        {/* Modal Preview Imagem */}
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

        {/* Modal Editar */}
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
                    <div className="h-[280px] sm:h-[360px] rounded-2xl border  bg-white flex items-center justify-center text-sm text-gray-500">
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

        {/* Modal Mudar imagem */}
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
                    {imgItem.object} {imgItem.info1 ? `• ${imgItem.info1}` : ""}{" "}
                    {imgItem.year ? `• ${imgItem.year}` : ""}
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

                  {/* Seta */}
                  {/* Coluna central: Seta + Motivo */}
                  <div className="hidden lg:flex flex-col items-center justify-start h-full pt-10 gap-6">
                    {/* Seta */}
                    <div
                      className="rounded-full px-4 py-2 text-sm font-extrabold"
                      style={{
                        backgroundColor: "rgba(244,200,46,0.25)",
                        color: BRAND_DARK,
                      }}
                    >
                      ➜
                    </div>

                    {/* Motivo */}
                    <div className="w-full max-w-[200px] rounded-2xl border bg-white p-4 shadow-sm">
                      <div
                        className="text-xs font-semibold mb-3 text-center"
                        style={{ color: BRAND_DARK }}
                      >
                        Motivo
                      </div>

                      <div className="flex flex-col gap-3 text-sm text-gray-700">
                        {/* Foto fora do padrão */}
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

                        {/* Foto errada */}
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

                  {/* Input SEMPRE presente, fora de qualquer condicional */}
                  <input
                    id={fileInputId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePickNewImage(e.target.files?.[0])}
                    disabled={savingImage}
                  />

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

                          {/* Zoom */}
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
                    <div className="mb-3">
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

        {/* Modal Excluir */}
        {delOpen && delItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() =>
              !deleteMutation.isPending && (setDelOpen(false), setDelItem(null))
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
                    Excluir item
                  </div>

                  <div className="mt-0.5 truncate text-xs text-gray-500">
                    {delItem.object}
                    {delItem.info1 ? ` • ${delItem.info1}` : ""}
                    {delItem.info2 ? ` • ${delItem.info2}` : ""}
                    {delItem.info3 ? ` • ${delItem.info3}` : ""}
                    {delItem.info4 ? ` • ${delItem.info4}` : ""}
                    {delItem.info5 ? ` • ${delItem.info5}` : ""}
                    {delItem.year ? ` • ${delItem.year}` : ""}
                    {delItem.year2 ? `/${delItem.year2}` : ""}
                  </div>

                  <div className="mt-0.5 truncate text-xs text-gray-500">
                    {delItem.slug}
                  </div>
                </div>

                <button
                  className="text-2xl font-bold text-gray-500 hover:text-gray-800"
                  onClick={() =>
                    !deleteMutation.isPending &&
                    (setDelOpen(false), setDelItem(null))
                  }
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                {delErr && (
                  <div className="mb-4 rounded-xl border bg-white p-3">
                    <div
                      className="text-xs font-semibold"
                      style={{ color: BRAND_DARK }}
                    >
                      Atenção
                    </div>
                    <div className="mt-1 text-xs text-gray-600">{delErr}</div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
                  {/* Imagem */}
                  <div className="sm:col-span-1">
                    <div className="text-xs font-semibold text-gray-600 mb-2">
                      Imagem do item
                    </div>

                    <div className="relative w-full aspect-[8/11] rounded-2xl overflow-hidden border bg-gray-50">
                      {delItem.images_url?.[0] ? (
                        <Image
                          src={delItem.images_url[0]}
                          alt={delItem.object ?? "Imagem do item"}
                          fill
                          sizes="(max-width: 640px) 100vw, 200px"
                          className="object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                          Sem imagem
                        </div>
                      )}
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
                      value={delReason}
                      onChange={(e) => setDelReason(e.target.value)}
                      className="mt-2 w-full min-h-[180px] rounded-xl border bg-white p-3 text-sm outline-none focus:ring-2"
                      style={{ borderColor: "rgba(0,0,0,0.12)" }}
                      placeholder="Ex: Imagem não corresponde ao item / dados incompletos / item duplicado..."
                      disabled={deleteMutation.isPending}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t px-5 py-4 border-gray-200">
                <button
                  disabled={deleteMutation.isPending}
                  onClick={() => (setDelOpen(false), setDelItem(null))}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  disabled={deleteMutation.isPending}
                  onClick={handleConfirmDelete}
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
