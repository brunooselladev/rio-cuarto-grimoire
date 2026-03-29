/**
 * Logging estructurado para el router LLM.
 * Activar modo verbose con LLM_DEBUG=true.
 */

const DEBUG = process.env.LLM_DEBUG === 'true';

function ts() {
  return new Date().toISOString();
}

export const llmLogger = {
  start(provider, truncatedMsg) {
    console.log(`[wizard/llm] provider=${provider} start${DEBUG ? ` msg="${truncatedMsg}"` : ''}`);
  },

  success(provider, durationMs) {
    console.log(`[wizard/llm] provider=${provider} success duration=${durationMs}ms`);
  },

  failed(provider, status, retryable, durationMs, message) {
    console.warn(
      `[wizard/llm] provider=${provider} failed status=${status} retryable=${retryable} duration=${durationMs}ms msg="${message}"`,
    );
  },

  threw(provider, durationMs, errMessage) {
    console.warn(`[wizard/llm] provider=${provider} threw duration=${durationMs}ms err="${errMessage}"`);
  },

  allFailed(attempted) {
    console.error(`[wizard/llm] all providers failed attempted=[${attempted.join(',')}]`);
  },

  finalProvider(provider) {
    console.log(`[wizard/llm] final_provider=${provider}`);
  },

  skipped(provider, reason) {
    if (DEBUG) console.log(`[wizard/llm] provider=${provider} skipped reason=${reason}`);
  },
};
