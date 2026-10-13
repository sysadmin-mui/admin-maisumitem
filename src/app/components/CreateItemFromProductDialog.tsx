"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import Cropper from "react-easy-crop";

import { createItemFromProduct, fetchProductItemDraft, generateProductItemImage } from "../lib/endpoints";
import { getCroppedImageBlob } from "../lib/crop";
import type { AdminCatalogProduct, CreateItemFromProductResponse, CropAreaPixels, ProductItemDraft } from "../lib/types";

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || "Não foi possível concluir a operação. Tente novamente.";
  }
  if (error instanceof Error) return error.message;
  return "Não foi possível concluir a operação. Tente novamente.";
}

async function prepareGeneratedImage(image: Blob): Promise<string> {
  const source = new Image();
  const objectUrl = URL.createObjectURL(image);
  try {
    source.src = objectUrl;
    await source.decode();

    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 1100;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a imagem gerada.");
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function CreateItemFromProductDialog({ product, onClose, onCreated }: {
  product: AdminCatalogProduct;
  onClose: () => void;
  onCreated: (result: CreateItemFromProductResponse) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ProductItemDraft | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageOrigin, setImageOrigin] = useState<"OpenAI" | "Outra IA">("OpenAI");
  const [reviewingImage, setReviewingImage] = useState(false);
  const [externalImageSrc, setExternalImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState<CropAreaPixels | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preparingUpload, setPreparingUpload] = useState(false);
  const preview = useQuery({
    queryKey: ["admin-product-item-draft", product.id],
    queryFn: () => fetchProductItemDraft(product.id),
    retry: false,
  });
  const generate = useMutation({
    mutationFn: async () => prepareGeneratedImage(await generateProductItemImage(product.id)),
    onSuccess: (image) => {
      setGeneratedImage(image);
      setImageOrigin("OpenAI");
      setUploadError(null);
      setReviewingImage(true);
    },
  });
  const create = useMutation({
    mutationFn: async (value: ProductItemDraft) => {
      if (!generatedImage) throw new Error("Aprove uma imagem antes de criar o item.");
      const imageBlob = await fetch(generatedImage).then(response => response.blob());
      return createItemFromProduct(product.id, {
      team_type: value.team_type,
      info1: value.info1.trim(),
      info2: value.info2.trim(),
      info3: value.team_type === "Seleção" ? value.info1.trim() : value.info3.trim(),
      info4: value.info4.trim(),
      info5: value.info5.trim(),
      year: value.year,
      year2: value.year2,
      }, new File([imageBlob], "camisa-gerada.png", { type: "image/png" }));
    },
    onSuccess: onCreated,
  });

  useEffect(() => {
    if (preview.data) setDraft(preview.data);
  }, [preview.data]);

  useEffect(() => () => {
    if (externalImageSrc) URL.revokeObjectURL(externalImageSrc);
  }, [externalImageSrc]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const update = <K extends keyof ProductItemDraft>(key: K, value: ProductItemDraft[K]) => {
    setDraft(current => current ? { ...current, [key]: value } : current);
  };

  const selectExternalImage = async (file: File) => {
    setUploadError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setUploadError("Escolha uma imagem PNG, JPEG ou WebP de até 10 MB.");
      return;
    }

    setPreparingUpload(true);
    const src = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = src;
      await image.decode();
      if (image.naturalWidth === 800 && image.naturalHeight === 1100) {
        setGeneratedImage(await prepareGeneratedImage(file));
        setImageOrigin("Outra IA");
        setExternalImageSrc(null);
        generate.reset();
        create.reset();
        URL.revokeObjectURL(src);
      } else {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCropArea(null);
        setExternalImageSrc(src);
      }
    } catch {
      URL.revokeObjectURL(src);
      setUploadError("Não foi possível abrir esta imagem. Escolha outro arquivo.");
    } finally {
      setPreparingUpload(false);
    }
  };

  const applyExternalCrop = async () => {
    if (!externalImageSrc || !cropArea || preparingUpload) return;
    setPreparingUpload(true);
    setUploadError(null);
    try {
      const image = await getCroppedImageBlob(externalImageSrc, cropArea, 800, 1100, "image/png");
      setGeneratedImage(await prepareGeneratedImage(image));
      setImageOrigin("Outra IA");
      setExternalImageSrc(null);
      generate.reset();
      create.reset();
    } catch {
      setUploadError("Não foi possível preparar a imagem. Ajuste o recorte ou escolha outro arquivo.");
    } finally {
      setPreparingUpload(false);
    }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || create.isPending || generate.isPending) return;
    if (generatedImage) {
      create.reset();
      setReviewingImage(true);
    } else {
      generate.mutate();
    }
  };
  const photo = product.image_url || product.thumb_url;
  const busy = generate.isPending || create.isPending || preparingUpload;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="create-product-item-title"
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}
      className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-4xl overflow-auto rounded-2xl bg-white p-0 text-[#303030] shadow-xl backdrop:bg-black/65"
    >
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Produto da loja → catálogo</p>
            <h2 id="create-product-item-title" className="mt-1 text-xl font-bold">Criar item: camisa</h2>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Fechar" className="rounded-full px-2 text-2xl hover:bg-gray-100 disabled:opacity-50">×</button>
        </div>

        <div className="mt-5 flex gap-4 rounded-xl bg-gray-50 p-3">
          {photo ? <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-white sm:h-28 sm:w-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" className="h-full w-full object-contain" />
          </div> : <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500">Sem foto</div>}
          <div className="min-w-0 self-center">
            <p className="text-xs font-semibold text-gray-500">{product.merchant_name || "Loja não informada"}</p>
            <p className="mt-1 break-words text-sm font-semibold">{product.name}</p>
          </div>
        </div>

        {preview.isLoading && <p className="mt-6 text-sm text-gray-600">Buscando dados da camisa…</p>}
        {preview.isError && <div role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          {errorMessage(preview.error)} <button type="button" onClick={() => preview.refetch()} className="font-semibold underline">Tentar novamente</button>
        </div>}

        {draft && reviewingImage && generatedImage && <section className="mt-6" aria-label="Prévia da imagem gerada">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Revise a imagem antes de criar o item</h3>
              <p className="mt-1 text-sm text-gray-600">Compare o resultado com a foto da loja. Esta prévia é o PNG final em 800 × 1100. Gerar novamente faz uma nova chamada à OpenAI.</p>
            </div>
            <button type="button" onClick={() => { setExternalImageSrc(null); setReviewingImage(false); }} disabled={busy} className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">Voltar aos dados</button>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Imagem 1 · mockup fixo</p>
                <div className="flex h-40 items-center justify-center rounded-lg bg-white p-2 lg:h-52">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/camiseta_branca_800x1100.png" alt="Mockup branco usado como primeira referência" className="max-h-full max-w-full object-contain" />
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Imagem 2 · foto do produto</p>
                {photo && <div className="flex h-40 items-center justify-center rounded-lg bg-white p-2 lg:h-52">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt={`Produto original: ${product.name}`} className="max-h-full max-w-full object-contain" />
                </div>}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Imagem para aprovação · {imageOrigin}</p>
              <div className="flex max-h-[65vh] items-center justify-center rounded-lg bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={generatedImage} alt={`Camisa para aprovação: ${product.name}`} className="max-h-[63vh] max-w-full object-contain" />
              </div>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void selectExternalImage(file);
            }}
          />
          {externalImageSrc && <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h4 className="font-semibold">Ajustar imagem pronta</h4>
            <p className="mt-1 text-sm text-gray-600">Arraste e ajuste o enquadramento para salvar em 800 × 1100.</p>
            <div className="relative mx-auto mt-4 aspect-[8/11] w-full max-w-[300px] overflow-hidden rounded-xl bg-gray-200">
              <Cropper
                key={externalImageSrc}
                image={externalImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={8 / 11}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCropArea(pixels)}
                restrictPosition={false}
                mediaProps={{ onError: () => { setCropArea(null); setUploadError("Não foi possível abrir esta imagem. Escolha outro arquivo."); } }}
              />
            </div>
            <label className="mt-4 flex items-center gap-3 text-sm font-semibold">Zoom
              <input type="range" min={1} max={3} step={0.01} value={zoom} disabled={busy}
                onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-[#333333]" />
            </label>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => { setExternalImageSrc(null); setUploadError(null); }} disabled={busy} className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Cancelar ajuste</button>
              <button type="button" onClick={() => void applyExternalCrop()} disabled={!cropArea || busy} className="rounded-xl bg-[#333333] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{preparingUpload ? "Preparando imagem…" : "Usar esta imagem"}</button>
            </div>
          </div>}
          {uploadError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{uploadError}</p>}
          {generate.isError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{errorMessage(generate.error)}</p>}
          {create.isError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{errorMessage(create.error)}</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => { create.reset(); generate.mutate(); }} disabled={busy || !!externalImageSrc} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">{generate.isPending ? "Gerando novamente…" : "Gerar novamente"}</button>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">Inserir imagem de outra IA</button>
            <button type="button" onClick={() => create.mutate(draft)} disabled={busy || !!externalImageSrc} className="rounded-xl bg-[#333333] px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50">{create.isPending ? "Criando item…" : "Aprovar imagem e criar item"}</button>
          </div>
        </section>}

        {draft && !reviewingImage && <form onSubmit={submit} className="mt-6">
          <p className="mb-5 text-sm text-gray-600">Revise os dados. Ao confirmar, a imagem será gerada para sua aprovação antes de criar o item.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">Time ou seleção
              <select value={draft.team_type} onChange={(event) => {
                const teamType = event.target.value as ProductItemDraft["team_type"];
                setDraft(current => current ? { ...current, team_type: teamType, info3: teamType === "Seleção" ? current.info1 : preview.data?.team_type === "Time" ? preview.data.info3 : "" } : current);
              }} disabled={busy} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 font-normal">
                <option value="Time">Time</option>
                <option value="Seleção">Seleção</option>
              </select>
            </label>
            <label className="text-sm font-semibold">Nome do time ou seleção
              <input type="text" required maxLength={255} value={draft.info1} onChange={(event) => setDraft(current => current ? { ...current, info1: event.target.value, info3: current.team_type === "Seleção" ? event.target.value : current.info3 } : current)} disabled={busy} className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 font-normal" />
            </label>
            <label className="text-sm font-semibold">Marca
              <input type="text" required maxLength={255} value={draft.info2} onChange={(event) => update("info2", event.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 font-normal" />
            </label>
            {draft.team_type === "Time" ? <label className="text-sm font-semibold">País
              <input type="text" required maxLength={255} value={draft.info3} onChange={(event) => update("info3", event.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 font-normal" />
            </label> : <p className="self-end rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-600">País da seleção: <strong>{draft.info1.trim() || "—"}</strong></p>}
            <label className="text-sm font-semibold">Tipo da camisa
              <input type="text" required maxLength={255} value={draft.info4} onChange={(event) => update("info4", event.target.value)} disabled={busy} placeholder="Ex.: titular, reserva, treino" className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 font-normal" />
            </label>
            <label className="text-sm font-semibold">Esporte
              <input type="text" required maxLength={255} value={draft.info5} onChange={(event) => update("info5", event.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 font-normal" />
            </label>
            <label className="text-sm font-semibold">Ano
              <input type="number" min={1800} max={2200} value={draft.year ?? ""} onChange={(event) => update("year", event.target.value ? Number(event.target.value) : null)} disabled={busy} className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 font-normal" />
            </label>
            <label className="text-sm font-semibold">Ano final <span className="font-normal text-gray-500">(opcional)</span>
              <input type="number" min={draft.year || 1800} max={2200} value={draft.year2 ?? ""} onChange={(event) => update("year2", event.target.value ? Number(event.target.value) : null)} disabled={busy} className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 font-normal" />
            </label>
          </div>
          <p className="mt-4 text-xs text-gray-500">{draft.catalog_option_found ? "Time ou seleção encontrado no catálogo. Confira país e esporte antes de confirmar." : "Time ou seleção não encontrado no catálogo. Confira país e esporte antes de confirmar."}</p>
          {!draft.info5.trim() && <p className="mt-2 text-xs font-semibold text-amber-800">O esporte não veio preenchido do produto nem do catálogo. Informe antes de confirmar.</p>}
          <p className="mt-2 text-xs text-gray-500">A foto da loja será usada com o mockup fixo para gerar a imagem do novo item.</p>
          {!photo && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">Este produto não tem foto para gerar a imagem.</p>}
          {generate.isError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{errorMessage(generate.error)}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={busy || !photo || (!!draft.year2 && !draft.year)} className="rounded-xl bg-[#333333] px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50">{generate.isPending ? "Gerando imagem…" : generatedImage ? "Revisar imagem" : "Confirmar criação"}</button>
          </div>
        </form>}
      </div>
    </dialog>
  );
}
