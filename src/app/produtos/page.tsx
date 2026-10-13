"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import TopMenu from "../components/TopMenu";
import CreateItemFromProductDialog from "../components/CreateItemFromProductDialog";
import { fetchAllAdminProductFilters, fetchAllAdminProducts } from "../lib/endpoints";
import type { AdminCatalogProduct, AdminCatalogProductsPaginate } from "../lib/types";

const DAY_OPTIONS = [1, 3, 7, 14, 30, 90, 180, 365] as const;

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

function formatPrice(value: string | null, currency: string | null): string | null {
  if (value === null) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(amount);
  } catch {
    return `${currency || "BRL"} ${amount.toFixed(2)}`;
  }
}

function Pagination({ result, loading, onPage }: {
  result?: AdminCatalogProductsPaginate;
  loading: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={!result?.prev_page || loading} onClick={() => onPage(result?.prev_page || 1)} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">
        Anterior
      </button>
      <button type="button" disabled={!result?.next_page || loading} onClick={() => onPage(result?.next_page || 1)} className="rounded-xl bg-[#333333] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
        Próxima
      </button>
    </div>
  );
}

function ProductRow({ product, onPreview, onCreate }: {
  product: AdminCatalogProduct;
  onPreview: (product: AdminCatalogProduct) => void;
  onCreate: (product: AdminCatalogProduct) => void;
}) {
  const photo = product.image_url || product.thumb_url;
  const price = formatPrice(product.price_amount, product.currency);
  const previousPrice = formatPrice(product.original_price_amount, product.currency);
  const details = [
    product.object && `Objeto: ${product.object}`,
    product.brand_name && `Marca: ${product.brand_name}`,
    product.team_name && `${product.team_type === "Seleção" ? "Seleção" : "Time"}: ${product.team_name}`,
    product.country && `País: ${product.country}`,
    product.sport && `Esporte: ${product.sport}`,
    product.year && `Ano: ${product.year}`,
    product.size && `Tamanho: ${product.size}`,
    product.condition && `Condição: ${product.condition}`,
    product.type && `Tipo: ${product.type}`,
  ].filter(Boolean);

  return (
    <article className="flex gap-4 border-b border-gray-100 p-4 last:border-b-0 sm:gap-5 sm:p-5">
      <div className="shrink-0">
        {photo ? (
          <button type="button" onClick={() => onPreview(product)} aria-label={`Ampliar imagem de ${product.name}`} className="h-24 w-24 overflow-hidden rounded-xl bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c6a520] sm:h-32 sm:w-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" loading="lazy" className="h-full w-full object-contain" />
          </button>
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-400 sm:h-32 sm:w-32">Sem foto</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-[#fff4c3] px-2.5 py-1 font-semibold text-[#665000]">{product.merchant_name || "Loja não informada"}</span>
          <span>Cadastrado em {formatDate(product.created_at)}</span>
        </div>
        <h2 className="mt-2 break-words text-sm font-bold text-[#303030] sm:text-base">{product.name}</h2>
        {details.length > 0 && <p className="mt-2 break-words text-xs leading-5 text-gray-600">{details.join(" · ")}</p>}
        <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
          {price && <p className="text-sm font-bold text-[#303030]">{price}{previousPrice && previousPrice !== price && <span className="ml-2 font-normal text-gray-400 line-through">{previousPrice}</span>}</p>}
          {product.product_url && <a href={product.product_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#806600] underline underline-offset-4 hover:text-black">Ver na loja ↗</a>}
          {product.object?.trim().toLowerCase() === "camisa" && product.item_id === null && product.item_id_not_applicable === false && <button type="button" onClick={() => onCreate(product)} className="rounded-lg border border-[#333333] px-3 py-1.5 text-xs font-bold text-[#333333] hover:bg-gray-100">Criar item no catálogo</button>}
        </div>
      </div>
    </article>
  );
}

export default function AllProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [authenticated, setAuthenticated] = useState(false);
  const [days, setDays] = useState(0);
  const [object, setObject] = useState("");
  const [merchant, setMerchant] = useState("");
  const [pendingItem, setPendingItem] = useState(false);
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<AdminCatalogProduct | null>(null);
  const [creatingFrom, setCreatingFrom] = useState<AdminCatalogProduct | null>(null);
  const [createdNotice, setCreatedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionStorage.getItem("adminToken")) {
      router.replace("/");
      return;
    }
    setAuthenticated(true);
  }, [router]);

  useEffect(() => {
    if (!preview) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onEscape);
    };
  }, [preview]);

  const productsQuery = useQuery({
    queryKey: ["admin-all-products", days, object, merchant, pendingItem, page],
    queryFn: () => fetchAllAdminProducts(days, page, object, merchant, pendingItem),
    enabled: authenticated,
    placeholderData: keepPreviousData,
    retry: (count, error) => !(axios.isAxiosError(error) && error.response?.status === 401) && count < 2,
  });
  const filtersQuery = useQuery({
    queryKey: ["admin-all-products-filters"],
    queryFn: fetchAllAdminProductFilters,
    enabled: authenticated,
    retry: (count, error) => !(axios.isAxiosError(error) && error.response?.status === 401) && count < 2,
  });

  if (!authenticated) return null;

  const result = productsQuery.data;
  const loading = productsQuery.isFetching;
  const errorStatus = axios.isAxiosError(productsQuery.error) ? productsQuery.error.response?.status : null;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-[#303030]">
      <TopMenu />
      <main className="flex-1">
        <section className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#967800]">Catálogo / Produtos</p>
            <h1 className="text-2xl font-extrabold sm:text-3xl">Todos os produtos</h1>
            <p className="mt-2 text-sm text-gray-600">Consulte todos os produtos cadastrados, com ou sem pendências no catálogo.</p>
            <span className="mt-4 inline-block rounded-full bg-[#fff4c3] px-3 py-1 text-sm font-semibold">Total no filtro: {(result?.total ?? 0).toLocaleString("pt-BR")}</span>
          </div>
        </section>

        <section className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
          {createdNotice && <div role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">{createdNotice}</div>}
          <div className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm sm:grid-cols-3">
            <label className="text-sm font-semibold">Cadastro no período
              <select value={days} onChange={(event) => { setDays(Number(event.target.value)); setPage(1); }} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 font-normal focus:ring-2 focus:ring-[#f4c82e]">
                <option value={0}>Todo o período</option>
                {DAY_OPTIONS.map((value) => <option key={value} value={value}>{value} {value === 1 ? "dia" : "dias"}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">Objeto
              <select value={object} onChange={(event) => { setObject(event.target.value); setPage(1); }} disabled={filtersQuery.isLoading} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 font-normal focus:ring-2 focus:ring-[#f4c82e] disabled:opacity-50">
                <option value="">Todos os objetos</option>
                {filtersQuery.data?.objects.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">Loja
              <select value={merchant} onChange={(event) => { setMerchant(event.target.value); setPage(1); }} disabled={filtersQuery.isLoading} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 font-normal focus:ring-2 focus:ring-[#f4c82e] disabled:opacity-50">
                <option value="">Todas as lojas</option>
                {filtersQuery.data?.merchants.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="flex cursor-pointer items-start gap-3 border-t border-gray-100 pt-4 sm:col-span-3">
              <input type="checkbox" checked={pendingItem} onChange={(event) => { setPendingItem(event.target.checked); setPage(1); }} className="mt-1 h-4 w-4 accent-[#333333]" />
              <span>
                <span className="block text-sm font-semibold">Sem item no catálogo</span>
                <span className="block text-xs font-normal text-gray-500">Produtos sem item associado e marcados como aplicáveis ao catálogo.</span>
              </span>
            </label>
            {filtersQuery.isError && <p role="alert" className="text-sm text-red-700 sm:col-span-3">Não foi possível carregar os filtros. <button type="button" onClick={() => filtersQuery.refetch()} className="font-semibold underline">Tentar novamente</button></p>}
          </div>

          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
              <p className="text-sm text-gray-600">
                {loading ? "Carregando produtos…" : result ? `Mostrando ${result.from}–${result.to} de ${result.total.toLocaleString("pt-BR")} — página ${result.current_page}` : "Produtos"}
              </p>
              <Pagination result={result} loading={loading} onPage={setPage} />
            </div>

            {productsQuery.isError ? (
              <div role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
                Não foi possível carregar os produtos{errorStatus ? ` (erro ${errorStatus})` : ""}. <button type="button" onClick={() => productsQuery.refetch()} className="font-bold underline">Tentar novamente</button>
              </div>
            ) : productsQuery.isLoading ? (
              <div className="space-y-3 p-5">{[1, 2, 3, 4].map((key) => <div key={key} className="h-28 animate-pulse rounded-xl bg-gray-100" />)}</div>
            ) : result?.data.length ? (
              <div className={loading ? "opacity-60" : ""}>
                {result.data.map((product) => <ProductRow key={product.id} product={product} onPreview={setPreview} onCreate={(selected) => { setCreatedNotice(null); setCreatingFrom(selected); }} />)}
              </div>
            ) : (
              <div className="px-5 py-16 text-center">
                <p className="text-lg font-bold">Nenhum produto encontrado</p>
                <p className="mt-1 text-sm text-gray-500">{days > 0 ? "Nenhum produto foi cadastrado nesse período com os filtros selecionados." : "Ajuste os filtros para ampliar a busca."}</p>
                {days > 0 && <button type="button" onClick={() => { setDays(0); setPage(1); }} className="mt-4 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50">Ver todo o período</button>}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5">
              <span className="text-sm text-gray-500">{result ? `${result.from}–${result.to} de ${result.total.toLocaleString("pt-BR")}` : "—"}</span>
              <Pagination result={result} loading={loading} onPage={setPage} />
            </div>
          </div>
        </section>
      </main>

      {preview && (preview.image_url || preview.thumb_url) && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 sm:p-8">
        <div role="dialog" aria-modal="true" aria-label={`Imagem de ${preview.name}`} className="relative flex max-h-full max-w-5xl flex-col items-center gap-3">
          <button type="button" onClick={() => setPreview(null)} autoFocus aria-label="Fechar imagem" className="self-end rounded-full bg-white px-3 py-1 text-xl font-bold shadow-sm hover:bg-[#f4c82e]">×</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.image_url || preview.thumb_url || ""} alt={preview.name} className="max-h-[75vh] max-w-full rounded-xl bg-white object-contain shadow-2xl" />
          <p className="max-w-full truncate text-center text-sm font-semibold text-white">{preview.name}</p>
        </div>
      </div>}
      {creatingFrom && <CreateItemFromProductDialog
        key={creatingFrom.id}
        product={creatingFrom}
        onClose={() => setCreatingFrom(null)}
        onCreated={() => {
          setCreatingFrom(null);
          setCreatedNotice("Item criado com a imagem aprovada e produto associado com sucesso.");
          if (pendingItem && result?.data.length === 1 && page > 1) setPage(page - 1);
          queryClient.invalidateQueries({ queryKey: ["admin-all-products"] });
        }}
      />}
    </div>
  );
}
