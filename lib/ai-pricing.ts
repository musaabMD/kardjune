/** Pro AI allowance per calendar month (USD). */
export const PRO_AI_BUDGET_USD = 2;

/** Default OpenRouter model pricing (USD per 1M tokens). Update when OPENROUTER_MODEL changes. */
const MODEL_RATES: Record<string, { inputPerM: number; outputPerM: number }> = {
  "openai/gpt-4o-mini": { inputPerM: 0.15, outputPerM: 0.6 },
  "openai/gpt-4o": { inputPerM: 2.5, outputPerM: 10 },
  "anthropic/claude-3.5-sonnet": { inputPerM: 3, outputPerM: 15 },
};

const DEFAULT_RATES = MODEL_RATES["openai/gpt-4o-mini"];

export function monthStartUtcMs(date = new Date()) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export function nextMonthStartUtcMs(date = new Date()) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

export function estimateOpenRouterCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
) {
  const rates = MODEL_RATES[model] ?? DEFAULT_RATES;
  return (
    (promptTokens / 1_000_000) * rates.inputPerM +
    (completionTokens / 1_000_000) * rates.outputPerM
  );
}
