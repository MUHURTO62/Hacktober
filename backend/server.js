const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL_NAME = process.env.MODEL_NAME || 'openai/gpt-oss-20b';

app.use(express.json());
app.use(
  cors({
    origin: [FRONTEND_URL, 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
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
  res.json({
    status: 'ok',
    service: 'PaperPilot backend',
    model: MODEL_NAME,
    timestamp: new Date().toISOString(),
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
  const { subject, question } = req.body || {};

  if (!question || !question.trim()) {
    return res.status(400).json({
      error: 'Please enter a question or select a subject before generating practice content.',
    });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({
      error: 'Groq API key is not configured on the backend. Add GROQ_API_KEY to the server environment before running the AI feature.',
    });
  }

  try {
    const prompt = `You are helping a university student practice exam questions. Create 3 short practice questions similar to this topic and provide a simple explanation for each. Use this context: subject=${subject || 'General study'}, question=${question}. Keep the output in JSON with keys: questions (array of strings), explanations (array of strings), and note. The note should say this is sample practice content for study. Do not claim it is an official paper.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          {
            role: 'system',
            content: 'You generate educational exam practice materials in a helpful and concise manner.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({
        error: 'The AI service did not respond successfully. Please verify the Groq model and API key in the backend environment.',
        detail: errorText,
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      parsed = {
        questions: [content],
        explanations: ['The AI response was returned as text. Please try again with a simpler question.'],
        note: 'Sample study content only.',
      };
    }

    return res.json({
      source: 'Groq',
      model: MODEL_NAME,
      result: parsed,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to generate practice content. Please check the backend configuration and try again.',
      detail: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`PaperPilot backend running on http://localhost:${PORT}`);
});
