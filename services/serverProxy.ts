// Server proxy for operations that need a real credential.
//
// Nothing in this bundle may hold a server credential: everything Vite compiles
// is downloadable by anyone who loads the portal. Any call that needs a secret
// goes through a backend route here, where the secret stays server-side.
//
// Only non-secret configuration (a base URL) is read from import.meta.env.

const BACKEND_URL = import.meta.env.VITE_MCP_URL || 'https://mcp.elevenviews.io';

export interface ProxyResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  /** True when the backend has no route for this operation yet. */
  unavailable?: boolean;
}

/**
 * Result returned when a feature needs a server credential and no backend route
 * is serving it. Fails closed and says so, instead of silently doing nothing.
 */
export function serverSideOnly<T = unknown>(feature: string): ProxyResult<T> {
  const error = `${feature} requires a server-side credential and is not available from the browser.`;
  console.warn(`[serverProxy] ${error}`);
  return { success: false, error, unavailable: true };
}

/** A backend that accepts a request and never answers must not hang the UI. */
const DEFAULT_TIMEOUT_MS = 60000;

/**
 * Abort signal that fires on the caller's signal or after `timeoutMs`,
 * whichever comes first. Falls back to a manual controller on browsers without
 * `AbortSignal.any` / `AbortSignal.timeout`.
 */
function withTimeout(
  timeoutMs: number,
  callerSignal?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  const anyOf = (AbortSignal as any).any as ((signals: AbortSignal[]) => AbortSignal) | undefined;
  const timeoutOf = (AbortSignal as any).timeout as ((ms: number) => AbortSignal) | undefined;

  if (typeof anyOf === 'function' && typeof timeoutOf === 'function') {
    const timeoutSignal = timeoutOf(timeoutMs);
    const signal = callerSignal ? anyOf([callerSignal, timeoutSignal]) : timeoutSignal;
    return { signal, cleanup: () => {} };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('TimeoutError', 'TimeoutError')), timeoutMs);
  const onCallerAbort = () => controller.abort(callerSignal?.reason);

  if (callerSignal) {
    if (callerSignal.aborted) onCallerAbort();
    else callerSignal.addEventListener('abort', onCallerAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', onCallerAbort);
    },
  };
}

/**
 * POST to a backend route that holds the credential for this operation.
 * Never accepts or forwards a secret from the client.
 */
export async function proxyPost<T = unknown>(
  route: string,
  body: unknown,
  init: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<ProxyResult<T>> {
  const url = `${BACKEND_URL}${route.startsWith('/') ? route : `/${route}`}`;
  const { signal, cleanup } = withTimeout(init.timeoutMs ?? DEFAULT_TIMEOUT_MS, init.signal);

  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
      signal,
    });

    if (response.status === 404 || response.status === 501) {
      return serverSideOnly<T>(`Backend route ${route}`);
    }

    const text = await response.text();
    let payload: any = undefined;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      const error =
        (payload && typeof payload === 'object' && (payload.error || payload.message)) ||
        `Backend returned ${response.status}`;
      return { success: false, error: String(error) };
    }

    return { success: true, data: payload as T };
  } catch (err) {
    const aborted = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    const timedOut = aborted && !init.signal?.aborted;
    const error = timedOut
      ? `Backend route ${route} did not respond in time.`
      : err instanceof Error
        ? err.message
        : 'Backend request failed';
    console.error(`[serverProxy] ${route} failed:`, error);
    return { success: false, error };
  } finally {
    cleanup();
  }
}

export const SERVER_ROUTES = {
  sendEmail: '/api/email/send',
  notifyDiscord: '/api/notify/discord',
  geminiGenerate: '/api/ai/gemini/generate',
  geminiImage: '/api/ai/gemini/image',
  wasabiPresign: '/api/storage/presign',
} as const;

export default { proxyPost, serverSideOnly, SERVER_ROUTES };
