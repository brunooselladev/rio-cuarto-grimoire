/**
 * Helpers para clasificación de errores de proveedores LLM.
 */

/**
 * Determina si un error HTTP de proveedor es "reintentable" en el siguiente proveedor.
 * - 429 rate limit → sí
 * - 5xx server errors → sí
 * - 408 / 503 / 504 timeout-related → sí
 * - 4xx bad request (400, 401, 403) → no (problema de config o request, no vale reintentar)
 */
export function isRetryableStatus(status) {
  if (status === 429) return true;
  if (status >= 500) return true;
  if (status === 408 || status === 503 || status === 504) return true;
  return false;
}

/**
 * Trunca un string para logging seguro. No loguea API keys ni prompts completos.
 */
export function truncateForLog(str, maxLen = 120) {
  if (typeof str !== 'string') return String(str ?? '');
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen)}…[truncated ${str.length - maxLen} chars]`;
}

/**
 * Normaliza un error de proveedor a un objeto consistente.
 */
export function normalizeProviderError(providerName, status, rawBody) {
  let message = `HTTP ${status}`;
  try {
    const parsed = JSON.parse(rawBody);
    // Groq / OpenAI style
    if (parsed?.error?.message) message = parsed.error.message;
    // Anthropic style
    else if (parsed?.error?.detail) message = parsed.error.detail;
    // Gemini style (array wrapper)
    else if (Array.isArray(parsed) && parsed[0]?.error?.message) message = parsed[0].error.message;
  } catch {
    // rawBody is not JSON, use as-is (truncated)
    message = truncateForLog(rawBody, 200);
  }
  return { providerName, status, message, retryable: isRetryableStatus(status) };
}
