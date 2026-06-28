// Step 5: Normalize token usage from any provider into a standard shape
export const normalizeUsage = (provider, rawResponse) => {
  if (provider === "claude") {
    return {
      inputTokens: rawResponse.usage?.input_tokens || 0,
      outputTokens: rawResponse.usage?.output_tokens || 0
    };
  }
  if (provider === "openai" || provider === "groq" || provider === "deepseek") {
    return {
      inputTokens: rawResponse.usage?.prompt_tokens || 0,
      outputTokens: rawResponse.usage?.completion_tokens || 0
    };
  }
  if (provider === "gemini") {
    return {
      inputTokens: rawResponse.usageMetadata?.promptTokenCount || 0,
      outputTokens: rawResponse.usageMetadata?.candidatesTokenCount || 0
    };
  }
  return { inputTokens: 0, outputTokens: 0 };
};

// Step 5: Per-model pricing table (USD per 1K tokens)
// Prices are approximate public list prices. Update as providers change rates.
export const PRICING_TABLE = {
  openai: {
    'gpt-4o':            { input: 0.005,  output: 0.015  },
    'gpt-4o-mini':       { input: 0.00015,output: 0.0006 },
    'gpt-4-turbo':       { input: 0.01,   output: 0.03   },
    'gpt-3.5-turbo':     { input: 0.0005, output: 0.0015 },
    default:             { input: 0.005,  output: 0.015  },
  },
  claude: {
    'claude-3-5-sonnet-20240620': { input: 0.003, output: 0.015 },
    'claude-3-opus-20240229':     { input: 0.015, output: 0.075 },
    'claude-3-haiku-20240307':    { input: 0.00025, output: 0.00125 },
    default:                      { input: 0.003, output: 0.015 },
  },
  gemini: {
    'gemini-2.0-flash':  { input: 0.0001,  output: 0.0004 },
    'gemini-1.5-pro':    { input: 0.00125, output: 0.005 },
    'gemini-1.5-flash':  { input: 0.000075, output: 0.0003 },
    'gemini-1.0-pro':    { input: 0.0005, output: 0.0015 },
    default:             { input: 0.0001,  output: 0.0004 },
  },
  groq: {
    'llama-3.3-70b-versatile': { input: 0.00059, output: 0.00079 },
    'llama-3.1-8b-instant':    { input: 0.00005, output: 0.00008 },
    'mixtral-8x7b-32768':      { input: 0.00024, output: 0.00024 },
    default:                   { input: 0.00005, output: 0.00008 },
  },
  deepseek: {
    'deepseek-chat':     { input: 0.00014, output: 0.00028 },
    'deepseek-reasoner': { input: 0.00055, output: 0.00219 },
    default:             { input: 0.00014, output: 0.00028 },
  },
};

export const calculateCost = (provider, model, inputTokens, outputTokens) => {
  const providerPricing = PRICING_TABLE[provider];
  if (!providerPricing) return 0;
  const rates = (model && providerPricing[model]) || providerPricing.default;
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
};

// Step 5: Get per-message cost breakdown for display
export const getCostBreakdown = (provider, model, inputTokens, outputTokens) => {
  const providerPricing = PRICING_TABLE[provider];
  const rates = providerPricing
    ? ((model && providerPricing[model]) || providerPricing.default)
    : { input: 0, output: 0 };
  return {
    inputCost: (inputTokens / 1000) * rates.input,
    outputCost: (outputTokens / 1000) * rates.output,
    totalCost: (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output,
    ratesUsed: rates,
  };
};

// Step 6: Check budget thresholds and return alert level
export const checkBudgetThreshold = (totalTokens, budgetLimit) => {
  const percentUsed = (totalTokens / budgetLimit) * 100;
  if (percentUsed >= 100) return 'limit_reached';
  if (percentUsed >= 80)  return 'approaching_limit';
  return null;
};
