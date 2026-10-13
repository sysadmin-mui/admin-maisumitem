"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import Cropper from "react-easy-crop";

import { applyTicketImageWithAi, approveContributionItemImage, generateContributionItemImage, generateTicketImageWithAi } from "../lib/endpoints";
import { getCroppedImageBlob } from "../lib/crop";
import type { CropAreaPixels, IItemStatsData } from "../lib/types";

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) return error.response?.data?.message || "Não foi possível concluir a operação.";
  if (error instanceof Error) return error.message;
  return "Não foi possível concluir a operação.";
}

async function prepareImage(image: Blob): Promise<string> {
  const source = new Image();
  const url = URL.createObjectURL(image);
  try {
    source.src = url;
    await source.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 1100;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a imagem.");
    context.drawImage(source, 0, 0, 800, 1100);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ChangeContributionImageWithAiDialog({ item, ticketId, ticketImage, onClose, onApproved }: {
  item: IItemStatsData;
  ticketId?: string;
  ticketImage?: string;
  onClose: () => void;
  onApproved: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<string | null>(null);
  const [origin, setOrigin] = useState<"OpenAI" | "Outra IA">("OpenAI");
  const [externalSrc, setExternalSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState<CropAreaPixels | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const generate = useMutation({
    mutationFn: async () => prepareImage(await (ticketId
      ? generateTicketImageWithAi(ticketId)
      : generateContributionItemImage(item.id))),
    onSuccess: image => {
      setResult(image);
      setOrigin("OpenAI");
      setLocalError(null);
    },
  });
  const approve = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error("Gere ou insira uma imagem antes de aprovar.");
      const blob = await fetch(result).then(response => response.blob());
      const image = new File([blob], "camisa-gerada.png", { type: "image/png" });
      if (ticketId) await applyTicketImageWithAi(ticketId, image);
      else await approveContributionItemImage(item.id, image);
    },
    onSuccess: onApproved,
  });
  const busy = generate.isPending || approve.isPending || preparing;

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

  useEffect(() => () => {
    if (externalSrc) URL.revokeObjectURL(externalSrc);
  }, [externalSrc]);

  const selectExternal = async (file: File) => {
    setLocalError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setLocalError("Escolha uma imagem PNG, JPEG ou WebP de até 10 MB.");
      return;
    }
    setPreparing(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (image.naturalWidth === 800 && image.naturalHeight === 1100) {
        setResult(await prepareImage(file));
        setOrigin("Outra IA");
        setExternalSrc(null);
        generate.reset();
        approve.reset();
        URL.revokeObjectURL(url);
      } else {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCropArea(null);
        setExternalSrc(url);
      }
    } catch {
      URL.revokeObjectURL(url);
      setLocalError("Não foi possível abrir esta imagem.");
    } finally {
      setPreparing(false);
    }
  };

  const applyCrop = async () => {
    if (!externalSrc || !cropArea || busy) return;
    setPreparing(true);
    setLocalError(null);
    try {
      const blob = await getCroppedImageBlob(externalSrc, cropArea, 800, 1100, "image/png");
      setResult(await prepareImage(blob));
      setOrigin("Outra IA");
      setExternalSrc(null);
      generate.reset();
      approve.reset();
    } catch {
      setLocalError("Não foi possível preparar a imagem. Ajuste o recorte ou escolha outro arquivo.");
    } finally {
      setPreparing(false);
    }
  };

  return <dialog
    ref={dialogRef}
    aria-labelledby="change-contribution-ai-title"
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}
    className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-4xl overflow-auto rounded-2xl bg-white p-0 text-[#303030] shadow-xl backdrop:bg-black/65"
  >
    <div className="p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{ticketId ? "Ticket IMAGES · camisa" : "Contribuição · camisa"}</p>
          <h2 id="change-contribution-ai-title" className="mt-1 text-xl font-bold">Mudar imagem com IA</h2>
          <p className="mt-2 text-sm text-gray-600">{item.info1}{item.info2 ? ` · ${item.info2}` : ""}</p>
        </div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Fechar" className="rounded-full px-2 text-2xl hover:bg-gray-100 disabled:opacity-50">×</button>
      </div>

      <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
        {ticketId ? "A imagem sugerida no ticket será usada como referência. Após revisar o resultado, confirme para trocar a imagem do item, registrar os créditos como “Imagem gerada com auxílio de IA” e resolver o ticket. Nenhum e-mail será enviado ao usuário." : "A imagem atual será usada como referência. Após revisar o resultado, confirme para trocar a imagem, registrar os créditos como “Imagem gerada com auxílio de IA” e aprovar a contribuição. Nenhum e-mail será enviado ao usuário."}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{ticketId ? "Imagem sugerida no ticket" : "Imagem atual do usuário"}</p>
          <div className="flex h-72 items-center justify-center rounded-lg bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ticketImage || item.images_url[0]} alt={ticketId ? "Imagem sugerida no ticket" : "Imagem atual da contribuição"} className="max-h-full max-w-full object-contain" />
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Nova imagem{result ? ` · ${origin}` : ""}</p>
          <div className="flex h-72 items-center justify-center rounded-lg bg-white p-2">
            {result ? <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result} alt="Nova imagem para aprovação" className="max-h-full max-w-full object-contain" />
            </> : <span className="text-sm text-gray-500">Gere ou insira uma imagem para comparar.</span>}
          </div>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={busy}
        onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void selectExternal(file); }} />

      {externalSrc && <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h3 className="font-semibold">Ajustar imagem pronta</h3>
        <p className="mt-1 text-sm text-gray-600">Ajuste o recorte para 800 × 1100.</p>
        <div className="relative mx-auto mt-4 aspect-[8/11] w-full max-w-[300px] overflow-hidden rounded-xl bg-gray-200">
          <Cropper image={externalSrc} crop={crop} zoom={zoom} aspect={8 / 11}
            onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setCropArea(pixels)} restrictPosition={false} />
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm font-semibold">Zoom
          <input type="range" min={1} max={3} step={0.01} value={zoom} disabled={busy}
            onChange={event => setZoom(Number(event.target.value))} className="w-full accent-[#333333]" />
        </label>
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={() => setExternalSrc(null)} disabled={busy} className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold">Cancelar ajuste</button>
          <button type="button" onClick={() => void applyCrop()} disabled={!cropArea || busy} className="rounded-xl bg-[#333333] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Usar esta imagem</button>
        </div>
      </div>}

      {localError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{localError}</p>}
      {generate.isError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{errorMessage(generate.error)}</p>}
      {approve.isError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{errorMessage(approve.error)}</p>}

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={() => { approve.reset(); generate.mutate(); }} disabled={busy || !!externalSrc} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{generate.isPending ? "Gerando imagem…" : result ? "Gerar novamente" : "Gerar com IA"}</button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Inserir imagem de outra IA</button>
        <button type="button" onClick={() => approve.mutate()} disabled={!result || busy || !!externalSrc} className="rounded-xl bg-[#333333] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{approve.isPending ? "Salvando…" : ticketId ? "Aplicar imagem e resolver ticket" : "Aprovar imagem e contribuição"}</button>
      </div>
    </div>
  </dialog>;
}
