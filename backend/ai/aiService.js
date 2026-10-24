const { getDefaultModelKey, getModelOptions, resolveModelOption } = require('./modelConfig');
const { ProviderError } = require('./providerRequest');
const groqProvider = require('./groqProvider');
const openRouterProvider = require('./openRouterProvider');

const providers = {
  groq: groqProvider,
  openrouter: openRouterProvider,
};

function parsePracticeResult(content) {
  const normalized = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    const start = normalized.indexOf('{');
    const end = normalized.lastIndexOf('}');
    if (start < 0 || end <= start) {
      throw new ProviderError('The AI response could not be read. Please retry.', 502);
    }
    try {
      parsed = JSON.parse(normalized.slice(start, end + 1));
    } catch {
      throw new ProviderError('The AI response could not be read. Please retry.', 502);
    }
  }

  if (
    !parsed ||
    !Array.isArray(parsed.questions) ||
    !Array.isArray(parsed.explanations) ||
    !parsed.questions.every((item) => typeof item === 'string') ||
    !parsed.explanations.every((item) => typeof item === 'string')
  ) {
    throw new ProviderError('The AI response did not contain the expected practice format. Please retry.', 502);
  }

  return {
    questions: parsed.questions,
    explanations: parsed.explanations,
    note: typeof parsed.note === 'string' ? parsed.note : 'Sample study content only.',
  };
}

function createPrompt({ subject, question, mode }) {
  const context = `Subject: ${subject || 'General study'}\nQuestion or topic: ${question}`;

  if (mode === 'explain') {
    return `Explain the provided question in simple language for a university student. Return JSON only with keys: questions (an empty array), explanations (an array with one concise explanation), and note. Do not claim this is official material.\n\n${context}`;
  }

  return `Create 3 short practice questions similar to the provided question and give a simple explanation for each. Return JSON only with keys: questions (array of 3 strings), explanations (array of 3 strings), and note. The note must say this is sample practice content, not an official paper.\n\n${context}`;
}

async function generatePractice({ provider, model, subject, question, mode = 'practice' }, options = {}) {
  const env = options.env || process.env;
  const selected = resolveModelOption(provider, model, env);
  if (selected.error) {
    const error = new Error(selected.error);
    error.status = selected.status;
    throw error;
  }

  const option = selected.option;
  const apiKey = option.provider === 'groq' ? env.GROQ_API_KEY : env.OPENROUTER_API_KEY;
  const providerAdapter = providers[option.provider];
  const content = await providerAdapter.generateCompletion({
    model: option.modelId,
    apiKey,
    messages: [
      {
        role: 'system',
        content: 'You create clear, accurate university study materials. Return valid JSON only.',
      },
      { role: 'user', content: createPrompt({ subject, question, mode }) },
    ],
    fetchImpl: options.fetchImpl,
  });

  return {
    source: option.providerName,
    provider: option.provider,
    model: option.modelId,
    mode,
    result: parsePracticeResult(content),
  };
}

module.exports = {
  generatePractice,
  getDefaultModelKey,
  getModelOptions,
  parsePracticeResult,
};
