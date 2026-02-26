import { CropAreaPixels } from "./types";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.setAttribute("crossOrigin", "anonymous"); // se precisar
    img.src = url;
  });
}

export async function getCroppedImageBlob(
  imageSrc: string,
  cropPixels: CropAreaPixels,
  outputWidth: number,
  outputHeight: number,
  mime: "image/jpeg" | "image/png" = "image/jpeg",
  quality = 0.92,
): Promise<Blob> {
  const image = await createImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_CONTEXT_NULL");

  // desenha exatamente no tamanho final
  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("TOBLOB_FAILED"))),
      mime,
      quality,
    );
  });

  return blob;
}

export function blobToFile(blob: Blob, filename: string) {
  return new File([blob], filename, { type: blob.type });
}
