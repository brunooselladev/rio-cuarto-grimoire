/**
 * Configuración central de proveedores LLM.
 *
 * Variables de entorno relevantes:
 *   GROQ_API_KEY (opcional: varias keys separadas por coma → fallback en orden),
 *   ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY,
 *   DEEPSEEK_API_KEY (API oficial https://platform.deepseek.com/api_keys — no es OpenRouter),
 *   OPENROUTER_API_KEY, CEREBRAS_API_KEY
 *
 *   Por modelo (opcional; si no se define, se usa el default del proveedor):
 *   GROQ_MODEL, GROQ_FAST_MODEL, ANTHROPIC_MODEL, OPENAI_MODEL,
 *   GEMINI_MODEL, DEEPSEEK_MODEL,
 *   OPENROUTER_MODEL, OPENROUTER_ALT_MODEL, OPENROUTER_QWEN_MODEL,
 *   OPENROUTER_DEEPSEEK_MODEL (solo ID de modelo en OpenRouter, p.ej. deepseek/deepseek-chat:free — NO es una API key),
 *   CEREBRAS_MODEL
 *
 *   LLM_PROVIDER_ORDER   comma-separated, e.g. "gemini,groq,groq_fast,openrouter,openrouter_alt"
 *   LLM_TIMEOUT_MS       default 12000
 *   LLM_RETRIES          default 1  (attempts per provider before moving on)
 *   LLM_DEBUG            "true" enables verbose logging
 */

export const LLM_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS || '12000', 10);
export const LLM_RETRIES    = parseInt(process.env.LLM_RETRIES    || '1',     10);

function openRouterExtraHeaders() {
  return {
    'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3001',
    'X-Title': process.env.OPENROUTER_SITE_NAME || 'Rio Cuarto Grimoire',
  };
}

// Definiciones canónicas — todas OpenAI-compatible salvo Anthropic
const PROVIDER_DEFINITIONS = {
  groq: {
    name: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    /** Se reemplaza en getEnabledProviders por una entrada por key (parseGroqKeys). */
    apiKey: () => process.env.GROQ_API_KEY,
    defaultModel: 'llama-3.3-70b-versatile',
    modelEnvKey: 'GROQ_MODEL',
    usesGroqKeyList: true,
  },
  /** Mismo key que groq: modelo más chico si el 70B falla o está saturado */
  groq_fast: {
    name: 'groq_fast',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey: () => process.env.GROQ_API_KEY,
    defaultModel: 'llama-3.1-8b-instant',
    modelEnvKey: 'GROQ_FAST_MODEL',
    usesGroqKeyList: true,
  },
  anthropic: {
    name: 'anthropic',
    url: 'https://api.anthropic.com/v1/messages',
    apiKey: () => process.env.ANTHROPIC_API_KEY,
    defaultModel: 'claude-sonnet-4-20250514',
    modelEnvKey: 'ANTHROPIC_MODEL',
    isAnthropic: true,
  },
  openai: {
    name: 'openai',
    url: 'https://api.openai.com/v1/chat/completions',
    apiKey: () => process.env.OPENAI_API_KEY,
    defaultModel: 'gpt-4o-mini',
    modelEnvKey: 'OPENAI_MODEL',
  },
  gemini: {
    name: 'gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    apiKey: () => process.env.GEMINI_API_KEY,
    defaultModel: 'gemini-2.0-flash',
    modelEnvKey: 'GEMINI_MODEL',
    geminiTemperatureWorkaround: true,
  },
  /**
   * DeepSeek API oficial (OpenAI-compatible). Key: https://platform.deepseek.com/api_keys
   * Modelos típicos: deepseek-chat, deepseek-reasoner (más lento; subir LLM_TIMEOUT_MS).
   */
  deepseek: {
    name: 'deepseek',
    url: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: () => process.env.DEEPSEEK_API_KEY,
    defaultModel: 'deepseek-chat',
    modelEnvKey: 'DEEPSEEK_MODEL',
  },
  /**
   * Router de OpenRouter: elige entre modelos :free disponibles (mejor que un solo modelo free).
   * https://openrouter.ai/docs/guides/routing/routers/free-models-router
   */
  openrouter: {
    name: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: () => process.env.OPENROUTER_API_KEY,
    defaultModel: 'openrouter/free',
    modelEnvKey: 'OPENROUTER_MODEL',
    extraHeaders: openRouterExtraHeaders,
  },
  /** Fallback OpenRouter: modelo free explícito (si el router falla) */
  openrouter_alt: {
    name: 'openrouter_alt',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: () => process.env.OPENROUTER_API_KEY,
    defaultModel: 'meta-llama/llama-3.2-3b-instruct:free',
    modelEnvKey: 'OPENROUTER_ALT_MODEL',
    extraHeaders: openRouterExtraHeaders,
  },
  /** Segundo fallback free en OpenRouter */
  openrouter_qwen: {
    name: 'openrouter_qwen',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: () => process.env.OPENROUTER_API_KEY,
    defaultModel: 'qwen/qwen-2.5-7b-instruct:free',
    modelEnvKey: 'OPENROUTER_QWEN_MODEL',
    extraHeaders: openRouterExtraHeaders,
  },
  /**
   * DeepSeek vía OpenRouter (misma key que OPENROUTER_API_KEY). Solo el *nombre* del modelo OpenRouter;
   * la key de platform.deepseek.com no va aquí — usá el proveedor `deepseek` + DEEPSEEK_API_KEY.
   */
  openrouter_deepseek: {
    name: 'openrouter_deepseek',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: () => process.env.OPENROUTER_API_KEY,
    defaultModel: 'deepseek/deepseek-chat:free',
    modelEnvKey: 'OPENROUTER_DEEPSEEK_MODEL',
    extraHeaders: openRouterExtraHeaders,
  },
  cerebras: {
    name: 'cerebras',
    url: 'https://api.cerebras.ai/v1/chat/completions',
    apiKey: () => process.env.CEREBRAS_API_KEY,
    defaultModel: 'llama3.1-8b',
    modelEnvKey: 'CEREBRAS_MODEL',
  },
};

const DEFAULT_ORDER = [
  'groq',
  'groq_fast',
  'anthropic',
  'openai',
  'gemini',
  'deepseek',
  'openrouter',
  'openrouter_alt',
  'openrouter_qwen',
  'openrouter_deepseek',
  'cerebras',
];

function resolveOrder() {
  const envOrder = process.env.LLM_PROVIDER_ORDER;
  if (!envOrder) return DEFAULT_ORDER;
  return envOrder.split(',').map((s) => s.trim()).filter(Boolean);
}

function resolveProviderEntry(def) {
  const model = (process.env[def.modelEnvKey] || '').trim() || def.defaultModel;
  const { defaultModel, modelEnvKey, usesGroqKeyList, ...rest } = def;
  return { ...rest, model };
}

/** Una o más API keys de Groq (misma cuenta o varias cuentas), sin espacios extra. */
export function parseGroqKeys() {
  const raw = process.env.GROQ_API_KEY || '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Lista ordenada de proveedores con API key configurada.
 * GROQ_API_KEY puede ser "key1,key2,key3" → se generan entradas groq / groq[2] / … y lo mismo para groq_fast.
 */
export function getEnabledProviders() {
  const order = resolveOrder();
  const groqKeys = parseGroqKeys();
  const out = [];

  for (const name of order) {
    const def = PROVIDER_DEFINITIONS[name];
    if (!def) continue;

    if (def.usesGroqKeyList) {
      if (groqKeys.length === 0) continue;
      groqKeys.forEach((key, idx) => {
        const label = groqKeys.length > 1 ? `${def.name}[${idx + 1}]` : def.name;
        const withKey = {
          ...def,
          name: label,
          apiKey: () => key,
        };
        out.push(resolveProviderEntry(withKey));
      });
      continue;
    }

    if (!def.apiKey()) continue;
    out.push(resolveProviderEntry(def));
  }

  return out;
}

/**
 * Resumen para logs de arranque (sin exponer keys).
 */
export function getLLMStartupSummary() {
  const enabled = getEnabledProviders();
  if (enabled.length === 0) {
    return {
      ok: false,
      line:
        '[LLM] Ninguna API key de IA configurada. El Mago usará respuestas de fallback. '
        + 'Gratis típico: GEMINI_API_KEY (Google AI Studio), GROQ_API_KEY (console.groq.com), '
        + 'OPENROUTER_API_KEY (openrouter.ai — modelos :free y openrouter/free).',
    };
  }
  const detail = enabled.map((p) => `${p.name}→${p.model}`).join(' | ');
  return { ok: true, line: `[LLM] Proveedores activos (${enabled.length}): ${detail}` };
}
