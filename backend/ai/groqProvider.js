const { requestChatCompletion } = require('./providerRequest');

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

function generateCompletion({ model, apiKey, messages, fetchImpl }) {
  return requestChatCompletion({
    url: GROQ_CHAT_URL,
    apiKey,
    model,
    messages,
    fetchImpl,
  });
}

module.exports = { generateCompletion };
