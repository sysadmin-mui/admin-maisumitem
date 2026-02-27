import api from "@/services/axios";

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
  // se você já faz esse padrão nos outros fetch:
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) throw new Error("NO_BASEURL");

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
