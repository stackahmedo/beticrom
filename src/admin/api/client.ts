export interface ApiErrorShape {
  code: string;
  message: string;
  details?: Array<{ path: string; message: string }>;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Array<{ path: string; message: string }>;

  constructor(status: number, err: ApiErrorShape) {
    super(err.message || "Request failed");
    this.status = status;
    this.code = err.code || "API_ERROR";
    this.details = err.details;
  }
}

let csrfTokenStore: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfTokenStore = token;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (csrfTokenStore && options.method && !["GET", "HEAD", "OPTIONS"].includes(options.method.toUpperCase())) {
    headers.set("X-CSRF-Token", csrfTokenStore);
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
  });

  const contentType = res.headers.get("Content-Type") || "";
  if (!res.ok) {
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as { error?: ApiErrorShape };
      throw new ApiError(res.status, json.error || { code: "HTTP_ERROR", message: res.statusText });
    }
    throw new ApiError(res.status, { code: "HTTP_ERROR", message: await res.text() });
  }

  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}
