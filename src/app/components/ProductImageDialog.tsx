"use client";

import { useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import axios from "axios";
import type { AdminProduct, CropAreaPixels } from "../lib/types";
import { blobToFile, getCroppedImageBlob } from "../lib/crop";
import { uploadAdminProductImage } from "../lib/endpoints";

export default function ProductImageDialog({ product, onClose, onSaved }: {
  product: AdminProduct;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropAreaPixels | null>(null);
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => { dialog?.close(); document.body.style.overflow = overflow; };
  }, []);

  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  async function save() {
    if (!src || !area || saving.current) return;
    saving.current = true;
    setPending(true);
    setError(null);
    try {
      const blob = await getCroppedImageBlob(src, area, 800, 1100, "image/jpeg", 0.92);
      await uploadAdminProductImage(product.id, blobToFile(blob, `product-${product.id}.jpg`));
      await onSaved();
    } catch (err) {
      setError(axios.isAxiosError(err) && typeof err.response?.data?.message === "string"
        ? err.response.data.message : "Não foi possível trocar a foto. Tente novamente.");
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="product-image-title"
      onCancel={(event) => { event.preventDefault(); if (!saving.current) onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget && !saving.current) onClose(); }}
      className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-lg overflow-auto rounded-2xl bg-white p-6 text-[#303030] shadow-xl backdrop:bg-black/60">
      <h2 id="product-image-title" className="text-xl font-bold">Trocar foto</h2>
      <p className="mt-1 text-sm text-gray-600">{product.name}</p>
      <p className="mt-2 text-sm text-gray-600">Escolha a nova capa e ajuste o enquadramento. A imagem será salva no formato 800 × 1100.</p>
      <label className="mt-4 block text-sm font-semibold">
        Nova imagem
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={pending} autoFocus className="mt-2 block w-full text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setError(null);
            if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
              setError("Escolha uma imagem JPEG, PNG ou WebP de até 10 MB.");
              event.target.value = "";
              return;
            }
            setCrop({ x: 0, y: 0 }); setZoom(1); setArea(null);
            setSrc(URL.createObjectURL(file));
          }} />
      </label>
      {src && <>
        <div className={`relative mx-auto mt-4 aspect-[8/11] w-full max-w-[280px] overflow-hidden rounded-xl bg-gray-100 ${pending ? "pointer-events-none" : ""}`}>
          <Cropper key={src} image={src} crop={crop} zoom={zoom} aspect={8 / 11}
            onCropChange={setCrop} onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)} restrictPosition={false}
            onMediaLoaded={() => setError(null)}
            mediaProps={{ onError: () => { setArea(null); setError("Não foi possível abrir esta imagem. Escolha outro arquivo."); } }} />
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm font-semibold">Zoom
          <input type="range" min={1} max={3} step={0.01} value={zoom} disabled={pending}
            onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-[#b99400]" />
        </label>
      </>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" disabled={pending} onClick={onClose} className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50">Cancelar</button>
        <button type="button" disabled={!src || !area || pending} onClick={save} className="rounded-xl bg-[#f4c82e] px-4 py-2 text-sm font-bold disabled:opacity-50">{pending ? "Salvando..." : "Salvar foto"}</button>
      </div>
    </dialog>
  );
}
