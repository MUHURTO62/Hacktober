# PaperPilot

PaperPilot is a university study dashboard with a searchable demo question bank and AI-generated practice questions or explanations. Question-bank entries are sample data, not official past papers.

## Features

- Search and filter demo questions by subject, semester, and year.
- Generate similar practice questions or request a simple explanation.
- Choose a configured AI provider and model without reloading the app.
- Keep provider credentials on the Express backend; the browser receives model availability metadata only.

## Technology

- Frontend: React and Vite
- Backend: Node.js and Express
- Providers: Groq and OpenRouter, using their OpenAI-compatible chat completions formats
- Hosting: Vercel frontend and Render backend
- License: MIT (see [LICENSE](LICENSE))

## Provider and model options

The backend allowlist currently offers:

| Provider | Model ID | Display | Availability / price note |
| --- | --- | --- | --- |
| Groq | `openai/gpt-oss-20b` | GPT-OSS 20B | Previously verified with a successful live PaperPilot practice request. Requires a Groq account key and current provider access. |
| OpenRouter | `google/gemma-4-26b-a4b-it:free` | Gemma 4 26B A4B IT | Listed in OpenRouter's official catalog at $0 prompt/completion when checked on 2026-10-24. The listing reports a 262,144-token context and 32,768 maximum completion tokens. Free access can have limits, routing constraints, outages, or change; it is not unlimited or guaranteed. |

The model IDs above are server-controlled. The frontend cannot submit a provider URL or arbitrary model. `GROQ_MODEL` and `OPENROUTER_MODEL` must match their allowlisted IDs. The OpenRouter catalog entry verifies listing metadata only; PaperPilot has not made a live OpenRouter request in this environment. Check the [OpenRouter model catalog](https://openrouter.ai/api/v1/models) again before relying on availability. No claim is made about event eligibility or model licensing for a prize; check the applicable license and event rules independently.

Inference runs on the selected provider's hosted service. The Express backend validates the selected model and forwards the request; the React frontend never receives either provider key, and the app does not run a local model.

## Local setup

Use Node.js 18 or newer. In PowerShell on Windows, use `npm.cmd` if the shell blocks `npm.ps1` under its current execution policy.

1. Copy `backend/.env.example` to `backend/.env` and enter one or both provider keys locally.
2. Open a terminal in `backend`:
   ```powershell
   cd backend
   npm install
   npm run dev
   ```
3. In a second terminal, open `frontend`:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
4. Open the Vite URL, normally `http://localhost:5173`.

Run backend checks and build the frontend with:

```powershell
cd backend
npm test
cd ../frontend
npm run build
```

## Environment variables

Set provider keys only in `backend/.env` locally or in the Render service environment. Blank key values in the examples are placeholders, not usable credentials.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `PORT` | Backend | Express listen port; Render supplies its own value. |
| `FRONTEND_URL` | Backend | Deployed frontend origin allowed by CORS. |
| `GROQ_API_KEY` | Backend only | Groq credential. Optional if OpenRouter is configured. |
| `GROQ_MODEL` | Backend | Must be `openai/gpt-oss-20b`; defaults to that ID. |
| `OPENROUTER_API_KEY` | Backend only | OpenRouter credential. Optional if Groq is configured. |
| `OPENROUTER_MODEL` | Backend | Must be `google/gemma-4-26b-a4b-it:free`; defaults to that ID. |
| `VITE_API_URL` | Frontend build | Backend API base URL. Never put provider secrets in Vite variables. |

At least one provider key is needed for AI Practice. If just one is configured, the other model remains visible but disabled with a configuration message. When both are configured, users can switch between them during the current browser session.

## API

- `GET /api/health`: service status and configured provider names; never returns keys.
- `GET /api/questions`: demo question data and existing filters.
- `GET /api/ai/models`: allowlisted model details and whether each key is configured; never returns key values.
- `POST /api/practice`: accepts `subject`, `question`, optional `provider`, `model`, and `mode` (`practice` or `explain`). Older requests without provider/model use the first configured allowlisted model.

## Deployment

### Render backend

Create a Node web service connected to this repository:

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Add `FRONTEND_URL` with the Vercel deployment origin.
- Add `GROQ_API_KEY` and/or `OPENROUTER_API_KEY` privately in Render settings.
- Set `GROQ_MODEL=openai/gpt-oss-20b` and `OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free` if overriding defaults.

### Vercel frontend

Import the same repository with root directory `frontend`. Set `VITE_API_URL` to the Render backend base URL, for example `https://your-service.onrender.com`. Do not set provider keys in Vercel. Redeploy the frontend after changing `VITE_API_URL`; redeploy the backend after changing provider keys, model IDs, or CORS configuration.

## AI coding assistance disclosure

GitHub Copilot assisted with portions of the PaperPilot implementation and later modifications, including React UI work, Express provider integration, model-selection logic, tests, and documentation. The project direction and requirements were provided by the human project owner, who also controls provider accounts, credentials, deployment configuration, and final verification. Update this disclosure if the actual contribution split differs.

## License

MIT. See [LICENSE](LICENSE).
