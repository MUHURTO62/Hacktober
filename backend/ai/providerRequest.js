class ProviderError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
  }
}

async function requestChatCompletion({ url, apiKey, model, messages, headers = {}, fetchImpl = fetch }) {
  let response;

  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...headers,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new ProviderError('The AI provider timed out. Please retry or choose another model.', 504);
    }
    throw new ProviderError('Could not connect to the selected AI provider. Please retry.', 502);
  }

  if (response.status === 429) {
    throw new ProviderError('This provider is rate limited right now. Wait briefly and retry.', 429);
  }
  if (response.status === 401 || response.status === 403) {
    throw new ProviderError('The selected provider rejected its backend credentials or account access.', 502);
  }
  if (response.status === 404) {
    throw new ProviderError('The selected model is unavailable from this provider. Choose another configured model.', 503);
  }
  if (!response.ok) {
    throw new ProviderError('The selected AI provider could not complete the request. Please retry.', 502);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new ProviderError('The selected AI provider returned an invalid response.', 502);
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new ProviderError('The selected AI provider returned no usable text. Please retry.', 502);
  }

  return content.trim();
}

module.exports = { ProviderError, requestChatCompletion };
