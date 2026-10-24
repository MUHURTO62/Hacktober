const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { getDefaultModelKey, getModelOptions, generatePractice } = require('./ai/aiService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(express.json({ limit: '10kb' }));
app.use(
  cors({
    origin: [FRONTEND_URL, 'https://hacktober-tau.vercel.app', 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
    credentials: true,
  })
);

const demoQuestions = [
  {
    id: 1,
    subject: 'Computer Science',
    semester: 'Semester 3',
    year: 2024,
    title: 'Algorithm Complexity Analysis',
    question: 'Explain how Big O notation describes the growth rate of an algorithm.',
    type: 'demo',
    department: 'CSE',
  },
  {
    id: 2,
    subject: 'Mathematics',
    semester: 'Semester 2',
    year: 2023,
    title: 'Differential Equations',
    question: 'Solve a simple first-order linear differential equation and explain the method.',
    type: 'demo',
    department: 'Math',
  },
  {
    id: 3,
    subject: 'Physics',
    semester: 'Semester 1',
    year: 2022,
    title: 'Kinematics',
    question: 'A particle moves with constant acceleration; derive the velocity-time relation.',
    type: 'demo',
    department: 'Physics',
  },
  {
    id: 4,
    subject: 'Database Systems',
    semester: 'Semester 4',
    year: 2025,
    title: 'Normalization',
    question: 'Describe why 3NF is preferred over 1NF and 2NF for many database designs.',
    type: 'demo',
    department: 'CSE',
  },
  {
    id: 5,
    subject: 'Economics',
    semester: 'Semester 5',
    year: 2024,
    title: 'Demand and Supply',
    question: 'Explain how equilibrium price changes when supply decreases while demand remains stable.',
    type: 'demo',
    department: 'Business',
  },
];

app.get('/api/health', (req, res) => {
  const defaultModelKey = getDefaultModelKey();
  const defaultModel = getModelOptions().find((option) => option.key === defaultModelKey);
  const availableModels = getModelOptions().filter((option) => option.available);
  res.json({
    status: 'ok',
    service: 'PaperPilot backend',
    model: defaultModel?.modelId || process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
    availableProviders: [...new Set(availableModels.map((option) => option.provider))],
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/ai/models', (req, res) => {
  res.json({
    models: getModelOptions().map(({ key, provider, providerName, modelId, displayName, priceLabel, free, available, unavailableReason }) => ({
      key,
      provider,
      providerName,
      modelId,
      displayName,
      priceLabel,
      free,
      available,
      unavailableReason,
    })),
    defaultModelKey: getDefaultModelKey(),
  });
});

app.get('/api/questions', (req, res) => {
  const { subject, semester, year, search } = req.query;
  let filtered = [...demoQuestions];

  if (subject && subject !== 'all') {
    filtered = filtered.filter((item) => item.subject.toLowerCase() === subject.toLowerCase());
  }

  if (semester && semester !== 'all') {
    filtered = filtered.filter((item) => item.semester.toLowerCase() === semester.toLowerCase());
  }

  if (year && year !== 'all') {
    const yearValue = Number(year);
    filtered = filtered.filter((item) => item.year === yearValue);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.question.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q)
    );
  }

  res.json({
    message: 'Demo question data for PaperPilot. This is sample data, not official past papers.',
    questions: filtered,
    count: filtered.length,
  });
});

app.post('/api/practice', async (req, res) => {
  const { subject, question, provider, model, mode = 'practice' } = req.body || {};

  if (typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({
      error: 'Please enter a question or select a subject before generating practice content.',
    });
  }

  if (question.trim().length > 2000) {
    return res.status(400).json({ error: 'Keep the question under 2,000 characters.' });
  }

  if (typeof subject !== 'undefined' && (typeof subject !== 'string' || subject.length > 100)) {
    return res.status(400).json({ error: 'Subject must be plain text under 100 characters.' });
  }

  if (!['practice', 'explain'].includes(mode)) {
    return res.status(400).json({ error: 'Choose a supported AI task.' });
  }

  let selectedProvider = provider;
  let selectedModel = model;
  if (!selectedProvider && !selectedModel) {
    const defaultKey = getDefaultModelKey();
    const defaultOption = getModelOptions().find((option) => option.key === defaultKey);
    if (!defaultOption) {
      return res.status(503).json({
        error: 'No AI provider is configured. Add GROQ_API_KEY or OPENROUTER_API_KEY to the backend environment.',
      });
    }
    selectedProvider = defaultOption.provider;
    selectedModel = defaultOption.modelId;
  }

  if (typeof selectedProvider !== 'string' || typeof selectedModel !== 'string') {
    return res.status(400).json({ error: 'Select a supported AI provider and model.' });
  }

  try {
    const result = await generatePractice({
      provider: selectedProvider,
      model: selectedModel,
      subject,
      question: question.trim(),
      mode,
    });
    return res.json(result);
  } catch (error) {
    return res.status(error.status || 502).json({
      error: error.message || 'Failed to generate practice content. Please retry or choose another model.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`PaperPilot backend running on http://localhost:${PORT}`);
});
