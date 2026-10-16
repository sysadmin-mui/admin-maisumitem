"use client";

import { useEffect, useRef } from "react";

import type { AdminProduct } from "../lib/types";

export default function DeleteProductDialog({
  product,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  product: AdminProduct;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="delete-product-title"
      aria-describedby="delete-product-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-lg overflow-auto rounded-2xl bg-white p-0 text-[#303030] shadow-xl backdrop:bg-black/60"
    >
      <div className="p-6">
        <h2 id="delete-product-title" className="text-xl font-bold">Excluir produto?</h2>
        <p id="delete-product-description" className="mt-2 text-sm text-gray-600">
          O produto e seu histórico de preços serão excluídos do banco. Esta ação não pode ser desfeita.
        </p>
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="break-words font-semibold">{product.name}</p>
          <p className="mt-1 text-sm text-gray-600">{product.merchant_name || "Loja não informada"}</p>
          <p className="mt-2 break-all text-xs text-gray-500">ID: {product.id}</p>
        </div>
        <p className="mt-4 text-xs text-gray-600">
          Se a loja ainda enviar este produto, ele poderá voltar em uma próxima importação.
        </p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={pending} autoFocus className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Cancelar</button>
          <button type="button" onClick={onConfirm} disabled={pending} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50">
            {pending ? "Excluindo..." : "Excluir produto"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
