"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import TopMenu from "../components/TopMenu";
import ProductImageDialog from "../components/ProductImageDialog";
import CreateCatalogOptionDialog, {
  CatalogOptionDraft,
  catalogCategoryLabels,
} from "../components/CreateCatalogOptionDialog";
import type { AdminProduct, CreateCatalogOptionPayload } from "../lib/types";
import {
  fetchAdminProductObjectOptions,
  fetchAdminProductsMissingCatalogOption,
  createAdminCatalogOption,
  applyAdminProductCatalogOption,
} from "../lib/endpoints";

type Field = "brand" | "team";

const tabs: { field: Field; label: string; description: string }[] = [
  {
    field: "brand",
    label: "Marca",
    description: "Produtos com marca ausente de catalog_options.",
  },
  {
    field: "team",
    label: "Time",
    description: "Produtos com time ou seleção ausente de catalog_options.",
  },
];

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [authenticated, setAuthenticated] = useState(false);
  const [field, setField] = useState<Field>("brand");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [word, setWord] = useState("");
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ src: string; name: string } | null>(
    null,
  );
  const [catalogDraft, setCatalogDraft] = useState<CatalogOptionDraft | null>(
    null,
  );
  const [imageProduct, setImageProduct] = useState<AdminProduct | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (
      payload: CreateCatalogOptionPayload & { option_id?: number; new_title?: string; product_id: string; apply_all: boolean },
    ) =>
      payload.option_id !== undefined || payload.new_title !== undefined
        ? applyAdminProductCatalogOption({
            ...payload,
            option_id: payload.option_id,
          })
        : createAdminCatalogOption({
          title: payload.title,
          category: payload.category,
          country: payload.country,
          sport: payload.sport,
          }),
    onSuccess: async (result) => {
      const { option } = result;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-products-missing-catalog-option"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin-product-object-options"],
        }),
      ]);
      setCatalogDraft(null);
      setSuccessMessage(
        "updated_products" in result
          ? `${result.updated_products} produto(s) atualizado(s) para “${option.title}”.`
          : result.created
            ? `“${option.title}” foi cadastrado no catálogo.`
            : `“${option.title}” já estava cadastrado. A lista foi atualizada.`,
      );
    },
  });

  function openCatalogConfirmation(product: AdminProduct) {
    const title = (
      field === "brand" ? product.brand_name : product.team_name
    )?.trim();
    if (!title) return;
    createMutation.reset();
    setSuccessMessage(null);
    setCatalogDraft({
      title,
      product_id: product.id,
      category:
        field === "brand"
          ? "brands"
          : product.team_type === "Seleção"
            ? "nations"
            : "teams",
      suggestions: product.similar_catalog_options ?? [],
    });
  }

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
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [preview]);

  const query = useQuery({
    queryKey: [
      "admin-products-missing-catalog-option",
      field,
      page,
      word,
      selectedObjects,
    ],
    queryFn: () =>
      fetchAdminProductsMissingCatalogOption(
        field,
        page,
        word,
        selectedObjects,
      ),
    enabled: authenticated,
    retry: (count, error) =>
      !(axios.isAxiosError(error) && error.response?.status === 401) &&
      count < 2,
  });

  const objectOptionsQuery = useQuery({
    queryKey: ["admin-product-object-options", field],
    queryFn: () => fetchAdminProductObjectOptions(field),
    enabled: authenticated,
    retry: (count, error) =>
      !(axios.isAxiosError(error) && error.response?.status === 401) &&
      count < 2,
  });

  function selectTab(next: Field) {
    setField(next);
    setPage(1);
    setSelectedObjects([]);
  }

  function toggleObject(object: string) {
    setSelectedObjects((current) =>
      current.includes(object)
        ? current.filter((value) => value !== object)
        : [...current, object],
    );
    setPage(1);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWord(searchInput.trim());
    setPage(1);
  }

  if (!authenticated) return null;

  const result = query.data;
  const products = result?.data ?? [];
  const errorStatus = axios.isAxiosError(query.error)
    ? query.error.response?.status
    : null;

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#303030]">
      <TopMenu />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#967800]">
              Catálogo / Revisão
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">
              Correção de Produtos
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Confira produtos cadastrados cujos dados ainda não constam nas
              opções do catálogo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            {query.isFetching ? "Atualizando..." : "Atualizar lista"}
          </button>
        </div>

        {successMessage && (
          <p
            role="status"
            className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            {successMessage}
          </p>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 pt-5 sm:px-7">
            <div
              className="flex gap-2"
              role="tablist"
              aria-label="Campos do catálogo"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.field}
                  type="button"
                  role="tab"
                  aria-selected={field === tab.field}
                  onClick={() => selectTab(tab.field)}
                  className={`border-b-3 px-5 pb-4 pt-2 text-sm font-bold transition ${
                    field === tab.field
                      ? "border-[#f4c82e] text-[#303030]"
                      : "border-transparent text-gray-500 hover:text-[#303030]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <h2 className="text-lg font-bold">
                {tabs.find((tab) => tab.field === field)?.label} fora do
                catálogo
              </h2>
              <p className="text-sm text-gray-500">
                {tabs.find((tab) => tab.field === field)?.description}
              </p>
            </div>
            <form
              onSubmit={submitSearch}
              className="flex w-full gap-2 sm:w-auto"
            >
              <label htmlFor="product-search" className="sr-only">
                Buscar produto ou valor
              </label>
              <input
                id="product-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar produto ou valor"
                className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#c6a520] sm:w-64"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#303030] px-4 py-2 text-sm font-semibold text-white hover:bg-black"
              >
                Buscar
              </button>
            </form>
          </div>

          <details className="border-t border-gray-100 px-5 py-4 sm:px-7">
            <summary className="cursor-pointer text-sm font-semibold">
              Objetos
              {selectedObjects.length > 0
                ? ` (${selectedObjects.length} selecionados)`
                : " (todos)"}
            </summary>
            {objectOptionsQuery.isLoading ? (
              <p className="mt-3 text-sm text-gray-500">
                Carregando objetos...
              </p>
            ) : objectOptionsQuery.isError ? (
              <p className="mt-3 text-sm text-red-700">
                Não foi possível carregar os objetos.{" "}
                <button
                  type="button"
                  onClick={() => objectOptionsQuery.refetch()}
                  className="font-bold underline"
                >
                  Tentar novamente
                </button>
              </p>
            ) : objectOptionsQuery.data?.length ? (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {objectOptionsQuery.data.map((object) => (
                    <label
                      key={object}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${selectedObjects.includes(object) ? "border-[#d9b323] bg-[#fff4c3] font-semibold" : "border-gray-200 bg-gray-50 hover:bg-gray-100"}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedObjects.includes(object)}
                        onChange={() => toggleObject(object)}
                        className="accent-[#b99400]"
                      />
                      {object}
                    </label>
                  ))}
                </div>
                {selectedObjects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedObjects([]);
                      setPage(1);
                    }}
                    className="mt-4 text-sm font-semibold text-[#806600] underline underline-offset-4"
                  >
                    Limpar filtro de objetos
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                Nenhum objeto disponível nesta aba.
              </p>
            )}
          </details>

          <div className="border-t border-gray-100 px-5 py-3 text-xs font-semibold text-gray-500 sm:px-7">
            {query.isLoading
              ? "Carregando produtos..."
              : `${(result?.total ?? 0).toLocaleString("pt-BR")} produtos encontrados`}
            {word && <span> para “{word}”</span>}
          </div>

          {query.isError ? (
            <div
              role="alert"
              className="m-5 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 sm:mx-7"
            >
              Não foi possível carregar os produtos
              {errorStatus ? ` (erro ${errorStatus})` : ""}.
              <button
                type="button"
                onClick={() => query.refetch()}
                className="ml-2 font-bold underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : query.isLoading ? (
            <div className="space-y-3 p-5 sm:px-7">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-xl bg-gray-100"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="px-7 py-16 text-center">
              <p className="text-lg font-bold">Nenhum produto encontrado</p>
              <p className="mt-1 text-sm text-gray-500">
                Os valores desta aba já estão no catálogo ou não há produtos
                para a busca.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-5 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-7"
                >
                  <div className="row-span-2 w-24 sm:row-span-1 sm:w-32">
                    {product.thumb_url || product.image_url ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreview({
                            src: product.image_url || product.thumb_url || "",
                            name: product.name,
                          })
                        }
                        aria-label={`Ampliar imagem de ${product.name}`}
                        className="row-span-2 h-24 w-24 overflow-hidden rounded-xl bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c6a520] sm:row-span-1 sm:h-32 sm:w-32"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.image_url || product.thumb_url || ""}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      </button>
                    ) : (
                      <div className="row-span-2 flex h-24 w-24 items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-400 sm:row-span-1 sm:h-32 sm:w-32">
                        Sem foto
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setImageProduct(product)}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-2 py-2 text-xs font-semibold hover:bg-gray-50"
                    >
                      Trocar foto
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#fff4c3] px-2.5 py-0.5 text-xs font-bold text-[#665000]">
                        {field === "brand"
                          ? product.brand_name
                          : product.team_name}
                      </span>
                      {field === "team" && product.team_type && (
                        <span className="text-xs text-gray-500">
                          {product.team_type}
                        </span>
                      )}
                    </div>
                    <h3
                      className="mt-1 truncate text-sm font-semibold"
                      title={product.name}
                    >
                      {product.name}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {product.merchant_name || "Loja não informada"} · Visto em{" "}
                      {formatDate(product.last_seen_at)}
                    </p>
                    {product.similar_catalog_options !== undefined && (
                      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <p className="text-xs font-semibold text-gray-600">
                          Nomes próximos no catálogo
                        </p>
                        {product.similar_catalog_options.length > 0 ? (
                          <ul
                            className="mt-2 flex flex-wrap gap-1.5"
                            aria-label="Sugestões de nomes existentes"
                          >
                            {product.similar_catalog_options.map((option) => (
                              <li
                                key={option.id}
                                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
                              >
                                {option.title}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-xs text-gray-500">
                            Nenhum nome próximo encontrado.
                          </p>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => openCatalogConfirmation(product)}
                      disabled={createMutation.isPending || query.isFetching}
                      className="mt-3 rounded-lg bg-[#f4c82e] px-3 py-2 text-xs font-bold hover:bg-[#e8bb20] disabled:opacity-50"
                    >
                      {product.similar_catalog_options?.length
                        ? "Revisar"
                        : "Cadastrar"}{" "}
                      {
                        catalogCategoryLabels[
                          field === "brand"
                            ? "brands"
                            : product.team_type === "Seleção"
                              ? "nations"
                              : "teams"
                        ]
                      }
                    </button>
                  </div>
                  {product.product_url && (
                    <a
                      href={product.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="col-start-2 text-xs font-bold text-[#806600] underline underline-offset-4 hover:text-black sm:col-auto"
                    >
                      Ver produto ↗
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 text-sm sm:px-7">
            <span className="text-gray-500">
              {result && result.total > 0
                ? `${result.from}–${result.to} de ${result.total.toLocaleString("pt-BR")}`
                : "Nenhum resultado"}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!result?.prev_page || query.isFetching}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={!result?.next_page || query.isFetching}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </main>
      {imageProduct && (
        <ProductImageDialog
          product={imageProduct}
          onClose={() => setImageProduct(null)}
          onSaved={async () => {
            await queryClient.invalidateQueries({
              queryKey: ["admin-products-missing-catalog-option"],
            });
            setImageProduct(null);
            setSuccessMessage("Foto do produto atualizada.");
          }}
        />
      )}
      {catalogDraft && (
        <CreateCatalogOptionDialog
          draft={catalogDraft}
          pending={createMutation.isPending}
          error={
            createMutation.isError
              ? axios.isAxiosError(createMutation.error) &&
                typeof createMutation.error.response?.data?.message === "string"
                ? createMutation.error.response.data.message
                : "Não foi possível salvar. Tente novamente."
              : null
          }
          onClose={() => {
            if (!createMutation.isPending) setCatalogDraft(null);
          }}
          onConfirm={(choice) =>
            createMutation.mutate({
              title: catalogDraft.title,
              category: catalogDraft.category,
              product_id: catalogDraft.product_id,
              ...choice,
            })
          }
        />
      )}
      {preview && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreview(null);
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 sm:p-8"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Imagem de ${preview.name}`}
            className="relative flex max-h-full max-w-5xl flex-col items-center gap-3"
          >
            <button
              type="button"
              onClick={() => setPreview(null)}
              autoFocus
              aria-label="Fechar imagem"
              className="self-end rounded-full bg-white px-3 py-1 text-xl font-bold text-[#303030] shadow-sm hover:bg-[#f4c82e]"
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.src}
              alt={preview.name}
              className="max-h-[75vh] max-w-full rounded-xl bg-white object-contain shadow-2xl"
            />
            <p className="max-w-full truncate text-center text-sm font-semibold text-white">
              {preview.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
