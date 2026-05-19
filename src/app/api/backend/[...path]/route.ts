import { NextRequest, NextResponse } from "next/server";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type Params = {
  params: Promise<{
    path?: string[];
  }>;
};

function getApiBaseUrl() {
  const baseUrl =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.BACKEND_API_URL;

  if (!baseUrl) {
    throw new Error("API_URL is not configured");
  }

  return baseUrl.replace(/\/$/, "");
}

async function proxyRequest(req: NextRequest, { params }: Params) {
  const { path = [] } = await params;
  const target = new URL(`${getApiBaseUrl()}/${path.join("/")}`);
  target.search = req.nextUrl.search;

  const headers = new Headers(req.headers);

  HOP_BY_HOP_HEADERS.forEach((header) => headers.delete(header));

  const cloudflareAccessClientId = process.env.CF_ACCESS_CLIENT_ID;
  const cloudflareAccessClientSecret = process.env.CF_ACCESS_CLIENT_SECRET;

  if (cloudflareAccessClientId && cloudflareAccessClientSecret) {
    headers.set("CF-Access-Client-Id", cloudflareAccessClientId);
    headers.set("CF-Access-Client-Secret", cloudflareAccessClientSecret);
  }

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const upstreamResponse = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    redirect: "manual",
  });

  const responseHeaders = new Headers(upstreamResponse.headers);

  HOP_BY_HOP_HEADERS.forEach((header) => responseHeaders.delete(header));

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
