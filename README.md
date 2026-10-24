# PaperPilot

PaperPilot is a lightweight university study assistant created for a hackathon. It combines a demo question bank with AI-generated practice prompts powered by the Groq API.

## Tech stack

- Frontend: React + Vite
- Backend: Node.js + Express
- AI provider: Groq
- Model: `openai/gpt-oss-20b`
- Deployment target: Vercel frontend and Render backend

## AI coding assistance disclosure

This project was developed with AI-assisted coding support during the hackathon workflow. The application remains an original project implementation for a student study tool.

## Important model/provider note

The intended model is `openai/gpt-oss-20b` via Groq. Before final submission, confirm in the Groq dashboard that the model is available to your account, that it works in your region, and that the model usage meets the hackathon eligibility and policy requirements. This project does not include a real API key in source files or the frontend.

## Local setup

1. Open a terminal in the `backend` folder and create a local environment file:
   - Copy `backend/.env.example` to `backend/.env`
   - Add your Groq API key to `GROQ_API_KEY`
2. Open a second terminal in the `frontend` folder and create a local environment file:
   - Copy `frontend/.env.example` to `frontend/.env`
   - Leave the default value unless you are using a custom API URL
3. Run:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
4. In another terminal, run:
   ```bash
   cd frontend
   npm install
   npm run dev -- --host 0.0.0.0
   ```
5. Open the local Vite URL shown in the terminal.

## Backend environment variables

Use only backend environment variables for secrets:

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
GROQ_API_KEY=your_groq_api_key_here
MODEL_NAME=openai/gpt-oss-20b
```

## Security note

- Keep the Groq API key on the backend only.
- Never place the key in frontend code.
- Add `.env` and `.env.local` to `.gitignore` before any real secret is stored.

## License

MIT

## Project notes

- The question bank uses demo data and is clearly labeled as sample data.
- The app is intentionally lightweight and avoids unnecessary databases or heavy frameworks.
