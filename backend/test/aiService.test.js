const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generatePractice,
  getDefaultModelKey,
  getModelOptions,
  parsePracticeResult,
} = require('../ai/aiService');
const { resolveModelOption } = require('../ai/modelConfig');
const { requestChatCompletion, ProviderError } = require('../ai/providerRequest');

const groqEnv = {
  GROQ_API_KEY: 'test-groq-key',
  GROQ_MODEL: 'openai/gpt-oss-20b',
};
const openRouterEnv = {
  OPENROUTER_API_KEY: 'test-openrouter-key',
  OPENROUTER_MODEL: 'google/gemma-4-26b-a4b-it:free',
};

function completionResponse(content) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

const validCompletion = JSON.stringify({
  questions: ['Practice question'],
  explanations: ['Simple explanation'],
  note: 'Sample study content.',
});

test('provider catalog reports each provider independently', () => {
  assert.deepEqual(getModelOptions(groqEnv).map((item) => item.available), [true, false]);
  assert.deepEqual(getModelOptions(openRouterEnv).map((item) => item.available), [false, true]);
  assert.equal(getDefaultModelKey(groqEnv), 'groq:gpt-oss-20b');
  assert.equal(getDefaultModelKey(openRouterEnv), 'openrouter:gemma-4-26b-a4b-it-free');
  assert.equal(getDefaultModelKey({}), '');
});

test('server allowlist rejects arbitrary model identifiers', () => {
  const result = resolveModelOption('openrouter', 'attacker/custom-model', openRouterEnv);
  assert.equal(result.status, 400);
  assert.match(result.error, /not supported/i);
});

test('a supported provider without its key returns configuration guidance', () => {
  const result = resolveModelOption('openrouter', 'google/gemma-4-26b-a4b-it:free', {});
  assert.equal(result.status, 503);
  assert.match(result.error, /not configured/i);
});

test('Groq selection calls only the fixed Groq endpoint and returns the shared response format', async () => {
  let captured;
  const result = await generatePractice(
    {
      provider: 'groq',
      model: 'openai/gpt-oss-20b',
      subject: 'Computer Science',
      question: 'Explain Big O notation.',
    },
    {
      env: groqEnv,
      fetchImpl: async (url, options) => {
        captured = { url, options };
        return completionResponse(validCompletion);
      },
    }
  );

  assert.equal(captured.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(captured.options.headers.Authorization, 'Bearer test-groq-key');
  assert.equal(JSON.parse(captured.options.body).model, 'openai/gpt-oss-20b');
  assert.equal(result.provider, 'groq');
  assert.equal(result.model, 'openai/gpt-oss-20b');
  assert.deepEqual(result.result.questions, ['Practice question']);
});

test('OpenRouter selection calls only its fixed endpoint and model', async () => {
  let captured;
  const result = await generatePractice(
    {
      provider: 'openrouter',
      model: 'google/gemma-4-26b-a4b-it:free',
      subject: 'Physics',
      question: 'Describe acceleration.',
    },
    {
      env: openRouterEnv,
      fetchImpl: async (url, options) => {
        captured = { url, options };
        return completionResponse(validCompletion);
      },
    }
  );

  assert.equal(captured.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(captured.options.headers.Authorization, 'Bearer test-openrouter-key');
  assert.equal(JSON.parse(captured.options.body).model, 'google/gemma-4-26b-a4b-it:free');
  assert.equal(result.provider, 'openrouter');
  assert.equal(result.model, 'google/gemma-4-26b-a4b-it:free');
});

test('explain mode uses the selected provider and requests an explanation', async () => {
  let requestBody;
  const result = await generatePractice(
    {
      provider: 'groq',
      model: 'openai/gpt-oss-20b',
      subject: 'Mathematics',
      question: 'What is a derivative?',
      mode: 'explain',
    },
    {
      env: groqEnv,
      fetchImpl: async (_url, options) => {
        requestBody = JSON.parse(options.body);
        return completionResponse(JSON.stringify({
          questions: [],
          explanations: ['A derivative describes an instantaneous rate of change.'],
          note: 'Sample explanation.',
        }));
      },
    }
  );

  assert.match(requestBody.messages[1].content, /Explain the provided question/);
  assert.equal(result.mode, 'explain');
  assert.equal(result.provider, 'groq');
  assert.equal(result.result.explanations.length, 1);
});

test('fenced JSON from a provider is parsed into practice content', () => {
  assert.deepEqual(parsePracticeResult(`\`\`\`json\n${validCompletion}\n\`\`\``), {
    questions: ['Practice question'],
    explanations: ['Simple explanation'],
    note: 'Sample study content.',
  });
});

test('provider rate limiting produces a useful retryable error', async () => {
  await assert.rejects(
    requestChatCompletion({
      url: 'https://provider.example/chat',
      apiKey: 'test-key',
      model: 'test-model',
      messages: [],
      fetchImpl: async () => new Response('', { status: 429 }),
    }),
    (error) => error instanceof ProviderError && error.status === 429 && /rate limited/i.test(error.message)
  );
});
