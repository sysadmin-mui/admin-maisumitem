"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

const BRAND_DARK = "#333333";

export default function ItemImageCarousel({
  images,
  alt,
  size = 56,
  onOpen,
}: {
  images?: string[] | null;
  alt: string;
  size?: number;
  onOpen?: (src: string) => void;
}) {
  const safeImages = useMemo(
    () => (Array.isArray(images) ? images.filter(Boolean) : []),
    [images],
  );

  const [idx, setIdx] = useState(0);
  const total = safeImages.length;

  function prev() {
    if (total <= 1) return;
    setIdx((p) => (p - 1 + total) % total);
  }

  function next() {
    if (total <= 1) return;
    setIdx((p) => (p + 1) % total);
  }

  if (total === 0) {
    return (
      <div
        className="rounded-2xl border flex items-center justify-center text-xs font-semibold"
        style={{
          width: size,
          height: size,
          backgroundColor: "rgba(244,200,46,0.18)",
          color: BRAND_DARK,
        }}
      >
        ?
      </div>
    );
  }

  const currentSrc = safeImages[idx];

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={prev}
        disabled={total <= 1}
        className="h-7 w-7 rounded-xl border text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        title="Anterior"
      >
        ‹
      </button>

      <button
        type="button"
        className="relative overflow-hidden rounded-2xl border"
        style={{ width: size, height: size }}
        onClick={() => onOpen?.(currentSrc)}
        title="Ver imagem"
      >
        <Image
          src={currentSrc}
          alt={alt}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />

        {total > 1 && (
          <div
            className="absolute bottom-1 right-1 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "white" }}
          >
            {idx + 1}/{total}
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={next}
        disabled={total <= 1}
        className="h-7 w-7 rounded-xl border text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        title="Próxima"
      >
        ›
      </button>
    </div>
  );
}
