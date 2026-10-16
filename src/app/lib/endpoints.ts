import api from "@/services/axios";
import axios from "axios";
import type { AdminCatalogProductFilters, AdminCatalogProductsPaginate, AdminProductsPaginate, CreateCatalogOptionPayload, CreateCatalogOptionResponse, ProductItemDraft, CreateItemFromProductPayload, CreateItemFromProductResponse } from "./types";

export async function fetchAllAdminProducts(days: number, page: number, object: string, merchantName: string, pendingItem: boolean): Promise<AdminCatalogProductsPaginate> {
  const { data } = await api.get<AdminCatalogProductsPaginate>("/admin/products", {
    params: { days, page, per_page: 20, object: object || undefined, merchant_name: merchantName || undefined, pending_item: pendingItem || undefined },
  });
  return data;
}

export async function fetchAllAdminProductFilters(): Promise<AdminCatalogProductFilters> {
  const { data } = await api.get<AdminCatalogProductFilters>("/admin/products/filters");
  return data;
}

export async function fetchProductItemDraft(productId: string): Promise<ProductItemDraft> {
  const { data } = await api.get<ProductItemDraft>(`/admin/products/${productId}/item-draft`);
  return data;
}

export async function generateProductItemImage(productId: string): Promise<Blob> {
  try {
    const { data } = await api.post<Blob>(`/admin/products/${productId}/item-image`, undefined, { responseType: "blob" });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      let message: string | null = null;
      try {
        const details = JSON.parse(await error.response.data.text());
        if (typeof details.message === "string") message = details.message;
      } catch { /* A resposta não era JSON. */ }
      if (message) throw new Error(message);
    }
    throw error;
  }
}

export async function generateContributionItemImage(itemId: string): Promise<Blob> {
  try {
    const { data } = await api.post<Blob>(`/admin/items/${itemId}/image-ai`, undefined, { responseType: "blob" });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      try {
        const details = JSON.parse(await error.response.data.text());
        if (typeof details.message === "string") throw new Error(details.message);
      } catch (parsedError) {
        if (parsedError instanceof Error && !(parsedError instanceof SyntaxError)) throw parsedError;
      }
    }
    throw error;
  }
}

export async function approveContributionItemImage(itemId: string, image: File): Promise<void> {
  const form = new FormData();
  form.append("image", image);
  await api.patch(`/admin/items/${itemId}/image-ai`, form);
}

export async function generateTicketImageWithAi(ticketId: string): Promise<Blob> {
  try {
    const { data } = await api.post<Blob>(`/admin/tickets/${ticketId}/image-ai`, undefined, { responseType: "blob" });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      let message: string | null = null;
      try {
        const details = JSON.parse(await error.response.data.text());
        if (typeof details.message === "string") message = details.message;
      } catch { /* A resposta não era JSON. */ }
      if (message) throw new Error(message);
    }
    throw error;
  }
}

export async function applyTicketImageWithAi(ticketId: string, image: File): Promise<void> {
  const form = new FormData();
  form.append("image", image);
  await api.patch(`/admin/tickets/${ticketId}/image-ai`, form);
}

export async function createItemFromProduct(productId: string, payload: CreateItemFromProductPayload, image: File): Promise<CreateItemFromProductResponse> {
  const form = new FormData();
  form.append("image", image);
  form.append("team_type", payload.team_type);
  for (const field of ["info1", "info2", "info3", "info4", "info5"] as const) {
    form.append(field, payload[field]);
  }
  if (payload.year !== null) form.append("year", String(payload.year));
  if (payload.year2 !== null) form.append("year2", String(payload.year2));
  const { data } = await api.post<CreateItemFromProductResponse>(`/admin/products/${productId}/item`, form);
  return data;
}

import {
  AdminItemPatchPayload,
  AdminVariationPatchPayload,
  IStatsItemPaginate,
  IStatsVariationPaginate,
  IStatsTicketsPaginate,
  ITicketRow,
  IStatsCollectionPaginate,
  AdminStats,
  IStatsUserPaginate,
} from "./types";

export async function fetchAdminProductsMissingCatalogOption(
  field: "brand" | "team",
  page: number,
  word: string,
  objects: string[],
): Promise<AdminProductsPaginate> {
  const { data } = await api.get<AdminProductsPaginate>(
    "/admin/products/missing-catalog-option",
    { params: { field, page, per_page: 20, word, objects: objects.join(",") || undefined } },
  );
  return data;
}

export async function fetchAdminProductsMissingAttribute(
  field: "brand_name" | "team_name",
  page: number,
  word: string,
  objects: string[],
): Promise<AdminProductsPaginate> {
  const { data } = await api.get<AdminProductsPaginate>(
    "/admin/products/missing-attribute",
    { params: { field, page, per_page: 20, word, objects: objects.join(",") || undefined } },
  );
  return data;
}

export async function fetchAdminMissingAttributeObjectOptions(
  field: "brand_name" | "team_name",
): Promise<string[]> {
  const { data } = await api.get<string[]>(
    "/admin/products/missing-attribute/objects",
    { params: { field } },
  );
  return data;
}

export async function fillAdminProductMissingAttribute(payload: {
  product_id: string;
  field: "brand_name" | "team_name";
  option_id?: number;
  value?: string;
  new_title?: string;
  country?: string;
  sport?: string;
}): Promise<{ updated_products: number; value: string; created_catalog_option?: boolean }> {
  const { data } = await api.patch<{ updated_products: number; value: string; created_catalog_option?: boolean }>(
    "/admin/products/missing-attribute",
    payload,
  );
  return data;
}

export async function deleteAdminProduct(id: string): Promise<void> {
  await api.delete(`/admin/products/${id}`);
}

export async function fetchAdminProductObjectOptions(
  field: "brand" | "team",
): Promise<string[]> {
  const { data } = await api.get<string[]>(
    "/admin/products/missing-catalog-option/objects",
    { params: { field } },
  );
  return data;
}

export async function createAdminCatalogOption(
  payload: CreateCatalogOptionPayload,
): Promise<CreateCatalogOptionResponse> {
  const { data } = await api.post<CreateCatalogOptionResponse>(
    "/admin/catalog-options",
    payload,
  );
  return data;
}

export async function uploadAdminProductImage(id: string, file: File): Promise<{ image_url: string; thumb_url: string }> {
  const form = new FormData();
  form.append("image", file);
  const { data } = await api.patch(`/admin/products/${id}/image`, form);
  return data;
}

export async function applyAdminProductCatalogOption(
  payload: CreateCatalogOptionPayload & { option_id?: number; new_title?: string; product_id: string; apply_all: boolean },
): Promise<{ option: CreateCatalogOptionResponse["option"]; updated_products: number }> {
  const { data } = await api.patch("/admin/products/catalog-option", payload);
  return data;
}

export async function searchAdminCatalogOptions(category: CreateCatalogOptionPayload["category"], word: string) {
  const { data } = await api.get<{ data: CreateCatalogOptionResponse["option"][]; total: number }>("/admin/catalog-options", { params: { category, word } });
  return data;
}

export async function fetchAdminItems(days: number, page: number) {
  const res = await api.get<IStatsItemPaginate>("/admin/stats/items", {
    params: { days, page },
  });

  const json = res.data;
  return {
    from: Number(json.from) || 0,
    to: Number(json.to) || 0,
    per_page: Number(json.per_page) || 0,
    total: Number(json.total) || 0,
    current_page: Number(json.current_page) || page,
    prev_page: json.prev_page ?? null,
    next_page: json.next_page ?? null,
    data: Array.isArray(json.data) ? json.data : [],
  } satisfies IStatsItemPaginate;
}

export async function patchAdminItem(
  id: string,
  payload: AdminItemPatchPayload,
) {
  await api.patch(`/admin/items/${id}`, payload);
}

export async function uploadAdminItemImage(
  id: string,
  file: File,
  credits: string,
  reason: string,
) {
  const form = new FormData();

  form.append("images", file);
  form.append("credits", credits);
  form.append("reason", reason);

  const res = await api.patch(`/admin/items/image/${id}`, form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}

export async function approveAdminItem(id: string): Promise<void> {
  await api.patch(`/admin/items/approve/${id}`, {});
}

export async function deleteAdminItem(id: string, reason: string) {
  await api.delete(`/admin/items/${id}`, {
    data: { reason },
  });
}

export async function fetchAdminVariations(days: number, page: number) {
  const res = await api.get<IStatsVariationPaginate>(
    "/admin/stats/variations",
    {
      params: { days, page },
    },
  );

  const json = res.data;

  return {
    from: Number(json.from) || 0,
    to: Number(json.to) || 0,
    per_page: Number(json.per_page) || 0,
    total: Number(json.total) || 0,
    current_page: Number(json.current_page) || page,
    prev_page: json.prev_page ?? null,
    next_page: json.next_page ?? null,
    data: Array.isArray(json.data) ? json.data : [],
  } satisfies IStatsVariationPaginate;
}

export async function approveAdminVariation(variationId: string) {
  const { data } = await api.patch(
    `/admin/variations/approve/${variationId}`,
    {},
  );

  return data;
}

export async function patchAdminVariation(
  id: string,
  payload: AdminVariationPatchPayload,
) {
  await api.patch(`/admin/variations/${id}`, payload);
}

export async function deleteAdminVariation(id: string, reason: string) {
  await api.delete(`/admin/variations/${id}`, {
    data: { reason },
  });
}

export async function fetchAdminTickets(days: number, page: number) {
  const token =
    typeof window !== "undefined" ? sessionStorage.getItem("adminToken") : null;

  if (!token) throw new Error("NO_TOKEN");

  const res = await api.get<IStatsTicketsPaginate>("/admin/stats/tickets", {
    params: { days, page },
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = res.data;

  const rows: ITicketRow[] = Array.isArray(json.data) ? json.data : [];

  return {
    from: Number(json.from) || 0,
    to: Number(json.to) || 0,
    per_page: Number(json.per_page) || 0,
    total: Number(json.total) || 0,
    current_page: Number(json.current_page) || page,
    prev_page: json.prev_page ?? null,
    next_page: json.next_page ?? null,
    data: rows,
  } satisfies IStatsTicketsPaginate;
}

export async function closeAdminTicket(id: string): Promise<void> {
  await api.patch(`/admin/tickets/${id}/close`, {});
}

export async function uploadAdminImageSuggestion(
  id: string,
  file: File,
  credits: string,
  reason: string,
) {
  const form = new FormData();

  form.append("images", file);
  form.append("credits", credits);
  form.append("reason", reason);

  const res = await api.patch(`/admin/tickets/image/${id}`, form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}

export async function answerAdminTicket(ticketId: string, answer: string) {
  const { data } = await api.patch(`admin/tickets/answer/${ticketId}`, {
    answer,
  });

  return data;
}

export async function fetchAdminCollections(days: number, page: number) {
  const res = await api.get<IStatsCollectionPaginate>(
    "/admin/stats/collections",
    {
      params: { days, page },
    },
  );
  return res.data;
}

export async function fetchAdminStats() {
  const res = await api.get<AdminStats>("/admin/stats");
  const data = res.data;

  return {
    users: Number(data.users) || 0,
    collections: Number(data.collections) || 0,
    items: Number(data.items) || 0,
    posts: Number(data.posts) || 0,
    products: Number(data.products) || 0,
  };
}

export async function fetchAdminUsers(days: number, page: number) {
  const res = await api.get<IStatsUserPaginate>("/admin/stats/users", {
    params: { days, page },
  });

  const json = res.data;

  return {
    from: Number(json.from) || 0,
    to: Number(json.to) || 0,
    per_page: Number(json.per_page) || 0,
    total: Number(json.total) || 0,
    current_page: Number(json.current_page) || page,
    prev_page: json.prev_page ?? null,
    next_page: json.next_page ?? null,
    data: Array.isArray(json.data) ? json.data : [],
  } satisfies IStatsUserPaginate;
}
