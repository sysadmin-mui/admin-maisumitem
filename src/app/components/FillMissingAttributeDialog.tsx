"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { searchAdminCatalogOptions } from "../lib/endpoints";
import type { AdminProduct, CatalogOptionCategory } from "../lib/types";

export type MissingAttributeDraft = {
  product: AdminProduct;
  field: "brand_name" | "team_name";
  category: CatalogOptionCategory;
};

export default function FillMissingAttributeDialog({
  draft,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  draft: MissingAttributeDraft;
  pending: boolean;
  error: string | null;
  onConfirm: (choice: { option_id?: number; value?: string; new_title?: string; country?: string; sport?: string }) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"catalog" | "manual">("catalog");
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOption, setSelectedOption] = useState<{ id: number; title: string } | null>(null);
  const [value, setValue] = useState("");
  const [country, setCountry] = useState("");
  const [sport, setSport] = useState("");
  const label = draft.field === "brand_name" ? "Marca" : draft.category === "nations" ? "Seleção" : "Time";

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

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

  const catalogSearch = useQuery({
    queryKey: ["admin-catalog-search", draft.category, searchTerm],
    queryFn: () => searchAdminCatalogOptions(draft.category, searchTerm),
    enabled: mode === "catalog" && searchTerm.length > 0,
  });

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="missing-attribute-title"
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
        <h2 id="missing-attribute-title" className="text-xl font-bold">Revisar {label.toLowerCase()}</h2>
        <p className="mt-2 text-sm text-gray-600">Preencha o campo ausente deste produto com uma opção do catálogo ou com um nome escrito manualmente.</p>
        <p className="mt-4 break-words rounded-xl bg-[#fff4c3] p-4 font-semibold">{draft.product.name}</p>

        <fieldset disabled={pending} className="mt-5 space-y-3">
          <legend className="text-sm font-semibold">Como deseja preencher {label.toLowerCase()}?</legend>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" name="missing-attribute-mode" checked={mode === "catalog"} onChange={() => setMode("catalog")} className="accent-[#b99400]" />
            Buscar no catálogo
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" name="missing-attribute-mode" checked={mode === "manual"} onChange={() => setMode("manual")} className="accent-[#b99400]" />
            Escrever manualmente
          </label>
        </fieldset>

        {mode === "catalog" ? (
          <div className="mt-5">
            <label htmlFor="missing-attribute-search" className="block text-sm font-semibold">Buscar {label.toLowerCase()} no catálogo</label>
            <input
              id="missing-attribute-search"
              type="search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setSelectedOption(null); }}
              maxLength={255}
              disabled={pending}
              placeholder="Digite parte do nome"
              className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-[#c6a520]"
            />
            <div aria-live="polite" className="mt-3 text-sm">
              {search.trim() && (search.trim() !== searchTerm || catalogSearch.isFetching) ? (
                <p>Buscando...</p>
              ) : searchTerm && catalogSearch.isError ? (
                <p role="alert" className="text-red-700">Não foi possível pesquisar. <button type="button" onClick={() => catalogSearch.refetch()} className="underline">Tentar novamente</button></p>
              ) : searchTerm && catalogSearch.data ? (
                <>
                  {catalogSearch.data.total === 0 && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-gray-600">Nenhum nome encontrado nesta categoria.</p>
                      {draft.category === "teams" && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="text-sm font-semibold">País
                            <input type="text" value={country} onChange={(event) => setCountry(event.target.value)} maxLength={255} disabled={pending} placeholder="Ex.: Brasil" className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 font-normal" />
                          </label>
                          <label className="text-sm font-semibold">Esporte
                            <input type="text" value={sport} onChange={(event) => setSport(event.target.value)} maxLength={255} disabled={pending} placeholder="Ex.: Futebol" className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 font-normal" />
                          </label>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => onConfirm({ new_title: searchTerm, ...(draft.category === "teams" ? { country: country.trim(), sport: sport.trim() } : {}) })}
                        disabled={pending || (draft.category === "teams" && (!country.trim() || !sport.trim()))}
                        className="mt-3 rounded-lg bg-[#f4c82e] px-3 py-2 text-sm font-bold hover:bg-[#e8bb20] disabled:opacity-50"
                      >
                        {pending ? "Salvando..." : `Criar “${searchTerm}” no catálogo e preencher produto`}
                      </button>
                    </div>
                  )}
                  <div className="max-h-52 space-y-2 overflow-auto">
                    {catalogSearch.data.data.map((option) => (
                      <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${selectedOption?.id === option.id ? "border-[#d9b323] bg-[#fff4c3]" : "border-gray-200"}`}>
                        <input type="radio" name="missing-attribute-option" checked={selectedOption?.id === option.id} onChange={() => setSelectedOption(option)} disabled={pending} className="accent-[#b99400]" />
                        <span>{option.title}</span>
                      </label>
                    ))}
                  </div>
                  {catalogSearch.data.total > 50 && <p className="mt-2 text-gray-500">Mostrando 50 de {catalogSearch.data.total}. Refine a busca.</p>}
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <label className="mt-5 block text-sm font-semibold">
            Nome para {label.toLowerCase()}
            <input type="text" value={value} onChange={(event) => setValue(event.target.value)} maxLength={255} disabled={pending} placeholder="Digite o nome correto" className="mt-2 w-full rounded-xl border border-gray-300 p-3 font-normal outline-none focus:border-[#c6a520]" />
            <span className="mt-1 block text-xs font-normal text-gray-500">O valor será salvo apenas neste produto.</span>
          </label>
        )}

        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={pending} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Cancelar</button>
          <button
            type="button"
            onClick={() => onConfirm(mode === "catalog" ? { option_id: selectedOption!.id } : { value: value.trim() })}
            disabled={pending || (mode === "catalog" ? !selectedOption || !!search.trim() && search.trim() !== searchTerm : !value.trim())}
            className="rounded-xl bg-[#f4c82e] px-4 py-2 text-sm font-bold hover:bg-[#e8bb20] disabled:opacity-50"
          >
            {pending ? "Salvando..." : "Confirmar preenchimento"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
