/**
 * llmRouter.js — Router LLM multi-provider.
 *
 * Único punto de entrada para todas las llamadas de IA del Mago.
 * Recorre proveedores en orden, con timeout, retries y fallback automático.
 *
 * Uso:
 *   import { generateReply } from './ai/llmRouter.js';
 *
 *   const { text, meta } = await generateReply({
 *     systemPrompt,
 *     messages,            // [{ role: 'user'|'assistant', content: string }]
 *     maxTokens,           // default 200
 *     temperature,         // default 0.95
 *   });
 *
 * Siempre resuelve — si todos los proveedores fallan, devuelve { text: null, meta }.
 */

import { getEnabledProviders, LLM_TIMEOUT_MS, LLM_RETRIES } from './providerConfig.js';
import { normalizeProviderError, truncateForLog } from './errors.js';
import { llmLogger } from './logger.js';

// ── Extractores de texto por formato ────────────────────────────────────────

function extractOpenAIText(payload) {
  return payload?.choices?.[0]?.message?.content || '';
}

function extractAnthropicText(payload) {
  if (!Array.isArray(payload?.content)) return '';
  return payload.content
    .filter((b) => b?.type === 'text' && b.text)
    .map((b) => b.text)
    .join(' ')
    .trim();
}

// ── Construcción de request por proveedor ───────────────────────────────────

function buildRequest(provider, { systemPrompt, messages, maxTokens, temperature }) {
  if (provider.isAnthropic) {
    return {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages,
      }),
    };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${provider.apiKey()}`,
    ...(provider.extraHeaders ? provider.extraHeaders() : {}),
  };

  return {
    headers,
    body: JSON.stringify({
      model: provider.model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  };
}

// ── Timeout wrapper ──────────────────────────────────────────────────────────

function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

// ── Llamada a un proveedor, con retry si es retryable ───────────────────────

async function callProvider(provider, reqOptions, timeoutMs, maxRetries) {
  let attempt = 0;
  let lastError;

  while (attempt < maxRetries) {
    attempt++;
    const t0 = Date.now();

    try {
      const res = await fetchWithTimeout(provider.url, {
        method: 'POST',
        headers: reqOptions.headers,
        body: reqOptions.body,
      }, timeoutMs);

      const rawBody = await res.text();
      const duration = Date.now() - t0;

      if (!res.ok) {
        const err = normalizeProviderError(provider.name, res.status, rawBody);

        // Gemini 400: reintentar sin temperature antes de pasar al siguiente proveedor
        if (res.status === 400 && provider.geminiTemperatureWorkaround) {
          llmLogger.failed(provider.name, res.status, false, duration, 'gemini 400, retrying without temperature');
          const bodyObj = JSON.parse(reqOptions.body);
          delete bodyObj.temperature;
          const retryRes = await fetchWithTimeout(provider.url, {
            method: 'POST',
            headers: reqOptions.headers,
            body: JSON.stringify(bodyObj),
          }, timeoutMs);
          const retryRaw = await retryRes.text();
          if (retryRes.ok) {
            const payload = JSON.parse(retryRaw);
            return extractOpenAIText(payload);
          }
          const retryErr = normalizeProviderError(provider.name, retryRes.status, retryRaw);
          llmLogger.failed(provider.name, retryRes.status, retryErr.retryable, Date.now() - t0, retryErr.message);
          throw Object.assign(new Error(retryErr.message), { providerError: retryErr });
        }

        llmLogger.failed(provider.name, res.status, err.retryable, duration, err.message);

        if (!err.retryable) {
          // 4xx no reintentable → pasar al siguiente proveedor directamente
          throw Object.assign(new Error(err.message), { providerError: err, skipRetry: true });
        }

        lastError = Object.assign(new Error(err.message), { providerError: err });
        // retryable: loop de nuevo si hay intentos restantes
        continue;
      }

      const payload = JSON.parse(rawBody);
      const text = provider.isAnthropic ? extractAnthropicText(payload) : extractOpenAIText(payload);
      llmLogger.success(provider.name, duration);
      return text;

    } catch (err) {
      const duration = Date.now() - t0;

      if (err.skipRetry) throw err;

      // AbortError → timeout
      if (err.name === 'AbortError') {
        llmLogger.threw(provider.name, duration, `timeout after ${timeoutMs}ms`);
        lastError = err;
        continue;
      }

      llmLogger.threw(provider.name, duration, truncateForLog(err.message));
      lastError = err;
    }
  }

  throw lastError || new Error(`Provider ${provider.name} failed after ${maxRetries} attempt(s)`);
}

// ── Función principal exportada ──────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string}   opts.systemPrompt
 * @param {Array}    opts.messages        [{ role, content }]
 * @param {number}  [opts.maxTokens=200]
 * @param {number}  [opts.temperature=0.95]
 * @returns {{ text: string|null, meta: { provider: string|null, durationMs: number, attempted: string[] } }}
 */
export async function generateReply({ systemPrompt, messages, maxTokens = 200, temperature = 0.95 }) {
  const providers = getEnabledProviders();
  const attempted = [];
  const t0 = Date.now();

  if (providers.length === 0) {
    llmLogger.allFailed([]);
    return { text: null, meta: { provider: null, durationMs: 0, attempted: [] } };
  }

  const firstMsg = messages[0]?.content ?? '';
  const logMsg = truncateForLog(firstMsg, 60);

  let lastError;

  for (const provider of providers) {
    attempted.push(provider.name);
    llmLogger.start(provider.name, logMsg);

    const reqOptions = buildRequest(provider, { systemPrompt, messages, maxTokens, temperature });

    try {
      const text = await callProvider(provider, reqOptions, LLM_TIMEOUT_MS, LLM_RETRIES);
      llmLogger.finalProvider(provider.name);
      return {
        text,
        meta: { provider: provider.name, durationMs: Date.now() - t0, attempted },
      };
    } catch (err) {
      lastError = err;
      // Si es un error no-reintentable (4xx bad config), el provider ya logueó — seguimos
    }
  }

  llmLogger.allFailed(attempted);
  return {
    text: null,
    meta: { provider: null, durationMs: Date.now() - t0, attempted, error: lastError?.message },
  };
}
