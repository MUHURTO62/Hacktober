const { requestChatCompletion } = require('./providerRequest');

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

function generateCompletion({ model, apiKey, messages, fetchImpl }) {
  return requestChatCompletion({
    url: OPENROUTER_CHAT_URL,
    apiKey,
    model,
    messages,
    headers: {
      'HTTP-Referer': process.env.FRONTEND_URL || 'https://hacktober-tau.vercel.app',
      'X-Title': 'PaperPilot',
    },
    fetchImpl,
  });
}

module.exports = { generateCompletion };
