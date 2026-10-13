"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchAdminCatalogOptions } from "../lib/endpoints";
import type { AdminProduct, CreateCatalogOptionPayload } from "../lib/types";

export type CatalogOptionDraft = CreateCatalogOptionPayload & {
  product_id: string;
  suggestions: NonNullable<AdminProduct["similar_catalog_options"]>;
};

export const catalogCategoryLabels = {
  brands: "marca",
  teams: "time",
  nations: "seleção",
};

export default function CreateCatalogOptionDialog({
  draft,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  draft: CatalogOptionDraft;
  pending: boolean;
  error: string | null;
  onConfirm: (choice: { option_id?: number; new_title?: string; country?: string; sport?: string; apply_all: boolean }) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selection, setSelection] = useState<number | "create" | "custom" | null>(draft.suggestions.length ? null : "create");
  const [newTitle, setNewTitle] = useState("");
  const [country, setCountry] = useState("");
  const [sport, setSport] = useState("");
  const [applyAll, setApplyAll] = useState(false);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchedOption, setSearchedOption] = useState<{ id: number; title: string } | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const catalogSearch = useQuery({
    queryKey: ["admin-catalog-search", draft.category, searchTerm],
    queryFn: () => searchAdminCatalogOptions(draft.category, searchTerm),
    enabled: searchTerm.length > 0,
  });
  const selectedOption = draft.suggestions.find((option) => option.id === selection)
    ?? (searchedOption?.id === selection ? searchedOption : undefined);
  const replacement = selectedOption?.title ?? (selection === "custom" ? newTitle.trim() : "");
  const creatingTeam = draft.category === "teams" && (selection === "create" || selection === "custom");
  const missingTeamDetails = creatingTeam && (!country.trim() || !sport.trim());

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
      aria-labelledby="catalog-create-title"
      aria-describedby="catalog-create-description"
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
        <h2 id="catalog-create-title" className="text-xl font-bold">
          Revisar {catalogCategoryLabels[draft.category]}
        </h2>
        <p id="catalog-create-description" className="mt-2 text-sm text-gray-600">
          Selecione um nome existente, pesquise no catálogo ou escreva o nome correto para cadastrar.
        </p>
        <p className="mt-4 break-words rounded-xl bg-[#fff4c3] p-4 text-lg font-semibold">{draft.title}</p>
          <fieldset disabled={pending} className="mt-4 space-y-2">
            <legend className="mb-2 text-sm font-semibold">Qual é o nome correto?</legend>
            {draft.suggestions.map((option) => (
              <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${selection === option.id ? "border-[#d9b323] bg-[#fff4c3]" : "border-gray-200"}`}>
                <input type="radio" name="catalog-option-choice" checked={selection === option.id} onChange={() => setSelection(option.id)} className="accent-[#b99400]" />
                <span className="break-words">{option.title}<span className="block text-xs text-gray-500">Usar nome existente</span></span>
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm">
              <input type="radio" name="catalog-option-choice" checked={selection === "create"} onChange={() => setSelection("create")} className="accent-[#b99400]" />
              <span className="break-words">Cadastrar “{draft.title}” como novo</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm">
              <input type="radio" name="catalog-option-choice" checked={selection === "custom"} onChange={() => setSelection("custom")} className="accent-[#b99400]" />
              <span>Nenhuma dessas opções — escrever outro nome</span>
            </label>
            {selection === "custom" && <label className="block text-sm font-semibold">
              Nome correto
              <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} maxLength={255} placeholder="Ex.: Asa Sport" className="mt-2 w-full rounded-xl border border-gray-300 p-3 font-normal" />
              <span className="mt-1 block text-xs font-normal text-gray-500">O nome será cadastrado e aplicado aos produtos. Se já existir nesta categoria, usaremos o cadastro existente.</span>
            </label>}
            {creatingTeam && <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                País <span aria-hidden="true">*</span>
                <input type="text" value={country} onChange={(event) => setCountry(event.target.value)} maxLength={255} required placeholder="Ex.: Brasil" className="mt-2 w-full rounded-xl border border-gray-300 p-3 font-normal" />
              </label>
              <label className="block text-sm font-semibold">
                Esporte <span aria-hidden="true">*</span>
                <input type="text" value={sport} onChange={(event) => setSport(event.target.value)} maxLength={255} required placeholder="Ex.: Futebol" className="mt-2 w-full rounded-xl border border-gray-300 p-3 font-normal" />
              </label>
            </div>}
          </fieldset>
        <fieldset disabled={pending} className="mt-5">
          <label className="block text-sm font-semibold">Pesquisar no catálogo
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={255} placeholder="Digite parte do nome, ex.: Gr33n" className="mt-2 w-full rounded-xl border border-gray-300 p-3 font-normal" />
          </label>
          <div aria-live="polite" className="mt-2 text-sm">
            {search.trim() && (search.trim() !== searchTerm || catalogSearch.isFetching) ? <p>Buscando...</p> : searchTerm && catalogSearch.isError ? <p role="alert" className="text-red-700">Não foi possível pesquisar. <button type="button" onClick={() => catalogSearch.refetch()} className="underline">Tentar novamente</button></p> : searchTerm && search.trim() === searchTerm && catalogSearch.data ? <>
              {catalogSearch.data.total === 0 && <p className="text-gray-500">Nenhum nome encontrado nesta categoria.</p>}
              <div className="max-h-48 space-y-2 overflow-auto">
                {catalogSearch.data.data.map((option) => <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${selection === option.id ? "border-[#d9b323] bg-[#fff4c3]" : "border-gray-200"}`}>
                  <input type="radio" name="catalog-option-choice" checked={selection === option.id} onChange={() => { setSearchedOption(option); setSelection(option.id); }} className="accent-[#b99400]" />
                  <span>{option.title}</span>
                </label>)}
              </div>
              {catalogSearch.data.total > 50 && <p className="mt-2 text-gray-500">Mostrando 50 de {catalogSearch.data.total}. Refine a busca.</p>}
            </> : null}
          </div>
        </fieldset>
        {replacement && <fieldset disabled={pending} className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
          <legend className="font-semibold">Quais produtos deseja alterar?</legend>
          <label className="mt-2 flex cursor-pointer items-center gap-2">
            <input type="radio" name="catalog-update-scope" checked={!applyAll} onChange={() => setApplyAll(false)} />
            Somente este produto
          </label>
          <label className="mt-3 flex cursor-pointer items-center gap-2">
            <input type="radio" name="catalog-update-scope" checked={applyAll} onChange={() => setApplyAll(true)} />
            Todos os produtos com este nome
          </label>
          <p className="mt-3">{applyAll
            ? `Todos os produtos com ${catalogCategoryLabels[draft.category]} “${draft.title}” serão atualizados para “${replacement}”, em todas as lojas, inclusive fora dos filtros atuais. A correspondência é pelo nome completo, ignorando maiúsculas e espaços nas pontas.`
            : `Somente este produto terá ${catalogCategoryLabels[draft.category]} alterada de “${draft.title}” para “${replacement}”. Os demais produtos manterão o nome atual.`}</p>
        </fieldset>}
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={pending} autoFocus className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">
            Cancelar
          </button>
          <button type="button" onClick={() => onConfirm({ apply_all: applyAll, ...(typeof selection === "number" ? { option_id: selection } : selection === "custom" ? { new_title: newTitle.trim() } : {}), ...(creatingTeam ? { country: country.trim(), sport: sport.trim() } : {}) })} disabled={pending || selection === null || (selection === "custom" && !newTitle.trim()) || missingTeamDetails} className="rounded-xl bg-[#f4c82e] px-4 py-2 text-sm font-bold hover:bg-[#e8bb20] disabled:opacity-50">
            {pending ? "Salvando..." : replacement ? applyAll ? "Confirmar alteração de todos" : "Confirmar neste produto" : "Confirmar cadastro"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
