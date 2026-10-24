const MODEL_OPTIONS = [
  {
    key: 'groq:gpt-oss-20b',
    provider: 'groq',
    providerName: 'Groq',
    modelId: 'openai/gpt-oss-20b',
    displayName: 'GPT-OSS 20B',
    priceLabel: 'Usage billed by Groq',
    free: false,
  },
  {
    key: 'openrouter:gemma-4-26b-a4b-it-free',
    provider: 'openrouter',
    providerName: 'OpenRouter',
    modelId: 'google/gemma-4-26b-a4b-it:free',
    displayName: 'Gemma 4 26B A4B IT',
    priceLabel: 'Currently listed at $0; limits and availability may change',
    free: true,
  },
];

function getModelOptions(env = process.env) {
  return MODEL_OPTIONS.map((option) => {
    const keyName = option.provider === 'groq' ? 'GROQ_API_KEY' : 'OPENROUTER_API_KEY';
    const modelName = option.provider === 'groq' ? 'GROQ_MODEL' : 'OPENROUTER_MODEL';
    const keyConfigured = Boolean(env[keyName]);
    const configuredModel = env[modelName] || option.modelId;
    const modelSupported = configuredModel === option.modelId;

    let unavailableReason = '';
    if (!keyConfigured) {
      unavailableReason = `${option.providerName} is not configured on the backend.`;
    } else if (!modelSupported) {
      unavailableReason = `The configured ${modelName} is not in the server allowlist.`;
    }

    return {
      ...option,
      available: keyConfigured && modelSupported,
      unavailableReason,
    };
  });
}

function getDefaultModelKey(env = process.env) {
  const available = getModelOptions(env).filter((option) => option.available);
  return available.find((option) => option.provider === 'groq')?.key || available[0]?.key || '';
}

function resolveModelOption(provider, modelId, env = process.env) {
  const option = getModelOptions(env).find(
    (item) => item.provider === provider && item.modelId === modelId
  );

  if (!option) {
    return { error: 'That AI provider and model combination is not supported.', status: 400 };
  }

  if (!option.available) {
    return { error: option.unavailableReason, status: 503 };
  }

  return { option };
}

module.exports = { getDefaultModelKey, getModelOptions, resolveModelOption };
