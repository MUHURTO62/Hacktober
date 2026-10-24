import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SAVED_MODEL_KEY = 'paperpilot.ai-model';

function readSavedModelKey() {
  try {
    return window.sessionStorage.getItem(SAVED_MODEL_KEY) || '';
  } catch {
    return '';
  }
}

function App() {
  const [questions, setQuestions] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiSubject, setAiSubject] = useState('Computer Science');
  const [practiceResult, setPracticeResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [modelOptions, setModelOptions] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState('');
  const [selectedModelKey, setSelectedModelKey] = useState(readSavedModelKey);
  const [lastMode, setLastMode] = useState('practice');

  const uniqueSubjects = useMemo(
    () => [...new Set(questions.map((q) => q.subject))],
    [questions]
  );

  const uniqueSemesters = useMemo(
    () => [...new Set(questions.map((q) => q.semester))],
    [questions]
  );

  const uniqueYears = useMemo(
    () => [...new Set(questions.map((q) => q.year))].sort((a, b) => b - a),
    [questions]
  );

  const selectedModel = modelOptions.find((option) => option.key === selectedModelKey);
  const availableModelCount = modelOptions.filter((option) => option.available).length;

  useEffect(() => {
    fetchQuestions();
    fetchAIModels();
  }, []);

  useEffect(() => {
    if (!selectedModelKey) return;
    try {
      window.sessionStorage.setItem(SAVED_MODEL_KEY, selectedModelKey);
    } catch {
      // Session storage may be unavailable in private browsing contexts.
    }
  }, [selectedModelKey]);

  const fetchAIModels = async () => {
    try {
      setModelsLoading(true);
      setModelsError('');
      const response = await fetch(`${API_URL}/api/ai/models`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load available AI models.');
      const options = data.models || [];
      setModelOptions(options);
      setSelectedModelKey((current) =>
        options.some((option) => option.key === current && option.available)
          ? current
          : data.defaultModelKey || ''
      );
    } catch (err) {
      setModelsError(err.message || 'Could not load AI model configuration.');
    } finally {
      setModelsLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_URL}/api/questions`);
      if (!response.ok) {
        throw new Error('The question bank endpoint is not responding.');
      }
      const data = await response.json();
      setQuestions(data.questions || []);
    } catch (err) {
      setError(err.message || 'Unable to load the question bank.');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter((item) => {
    const subjectMatch = selectedSubject === 'all' || item.subject === selectedSubject;
    const semesterMatch = selectedSemester === 'all' || item.semester === selectedSemester;
    const yearMatch = selectedYear === 'all' || String(item.year) === String(selectedYear);
    const query = search.trim().toLowerCase();
    const textMatch =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.subject.toLowerCase().includes(query) ||
      item.question.toLowerCase().includes(query);

    return subjectMatch && semesterMatch && yearMatch && textMatch;
  });

  const handleGeneratePractice = async (mode = 'practice') => {
    const trimmed = aiInput.trim();
    if (!trimmed) {
      setAiError('Please enter a question or click a question card to reuse it.');
      return;
    }
    if (trimmed.length > 2000) {
      setAiError('Keep your question under 2,000 characters.');
      return;
    }
    if (!selectedModel || !selectedModel.available) {
      setAiError(selectedModel?.unavailableReason || 'Choose a configured AI model to continue.');
      return;
    }

    try {
      setAiLoading(true);
      setAiError('');
      setPracticeResult(null);
      setLastMode(mode);

      const response = await fetch(`${API_URL}/api/practice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: aiSubject,
          question: trimmed,
          provider: selectedModel.provider,
          model: selectedModel.modelId,
          mode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'AI practice generation failed.');
      }

      setPracticeResult(data);
    } catch (err) {
      setAiError(err.message || 'Unexpected error while generating practice.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">P</span>
          <div>
            <p className="eyebrow">Study desk / Chittagong</p>
            <h1>PaperPilot<span className="brand-period">.</span></h1>
          </div>
        </div>
        <div className="topbar-meta">
          <span className="status-pill"><span className="status-dot" /> Demo edition</span>
          <span className="topbar-date">FIELD NOTES / 2026</span>
        </div>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#question-bank">Question bank</a>
          <a href="#ai-practice">AI practice</a>
        </nav>
      </header>

      <main className="layout">
        <section className="panel question-panel" id="question-bank">
          <div className="panel-header">
            <div>
              <p className="section-kicker">01 / Question archive</p>
              <h2>Question Bank</h2>
            </div>
            <span className="badge warning">Sample data, not official past papers</span>
          </div>

          <div className="filters">
            <label>
              Search
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions or topics"
              />
            </label>

            <label>
              Subject
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                <option value="all">All subjects</option>
                {uniqueSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Semester
              <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}>
                <option value="all">All semesters</option>
                {uniqueSemesters.map((semester) => (
                  <option key={semester} value={semester}>
                    {semester}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Year
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                <option value="all">All years</option>
                {uniqueYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!loading && !error && (
            <div className="result-count">
              <span>{String(filteredQuestions.length).padStart(2, '0')}</span> entries in view
            </div>
          )}

          {loading && <div className="state-box">Loading demo question bank...</div>}

          {!loading && error && <div className="state-box error">{error}</div>}

          {!loading && !error && filteredQuestions.length === 0 && (
            <div className="state-box empty">
              No matching sample questions found. Try another subject or search term.
            </div>
          )}

          <div className="card-grid">
            {filteredQuestions.map((question) => (
              <article key={question.id} className="question-card">
                <div className="meta-row">
                  <span className="badge info">{question.subject}</span>
                  <span>{question.semester}</span>
                </div>
                <h3>{question.title}</h3>
                <p className="question-text">{question.question}</p>
                <div className="meta-row muted">
                  <span>Year: {question.year}</span>
                  <span>{question.department}</span>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setAiInput(question.question);
                    setAiSubject(question.subject);
                  }}
                >
                  Use for practice
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className="panel ai-panel" id="ai-practice">
          <div className="panel-header compact">
            <div>
              <p className="section-kicker">02 / Practice lab</p>
              <h2>AI Practice</h2>
            </div>
            <span className="badge success">
              <span className="status-dot" />
              {selectedModel ? `${selectedModel.providerName} / selected` : 'Choose a model'}
            </span>
          </div>

          <label htmlFor="model-select">AI model</label>
          <select
            id="model-select"
            value={selectedModelKey}
            disabled={modelsLoading || modelOptions.length === 0}
            onChange={(event) => {
              setSelectedModelKey(event.target.value);
              setAiError('');
              setPracticeResult(null);
            }}
          >
            {modelsLoading && <option value="">Loading model options...</option>}
            {!modelsLoading && modelOptions.length === 0 && <option value="">Model options unavailable</option>}
            {!modelsLoading && modelOptions.length > 0 && !selectedModelKey && (
              <option value="">Select an available model</option>
            )}
            {modelOptions.map((option) => (
              <option key={option.key} value={option.key} disabled={!option.available}>
                {option.providerName} / {option.displayName}{option.free ? ' / currently listed free' : ''}
                {!option.available ? ' / not configured' : ''}
              </option>
            ))}
          </select>
          {selectedModel && (
            <div className="model-detail" aria-live="polite">
              <strong>{selectedModel.providerName}</strong>
              <span>{selectedModel.modelId}</span>
              <small>{selectedModel.priceLabel}</small>
            </div>
          )}
          {!modelsLoading && availableModelCount === 0 && (
            <div className="state-box error" role="status">
              No AI provider is configured. Add a provider key in the backend environment to enable AI practice.
            </div>
          )}
          {modelsError && (
            <div className="state-box error" role="alert">
              {modelsError} <button className="text-button" onClick={fetchAIModels}>Retry</button>
            </div>
          )}

          <label>
            Subject
            <select value={aiSubject} onChange={(e) => setAiSubject(e.target.value)}>
              {uniqueSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </label>

          <label>
            Practice prompt
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Paste a question or describe the concept you want to practice"
              maxLength={2000}
              rows={7}
            />
          </label>

          <div className="practice-actions">
            <button
              className="primary-button"
              onClick={() => handleGeneratePractice('practice')}
              disabled={aiLoading || modelsLoading || !selectedModel?.available}
            >
              {aiLoading && lastMode === 'practice' ? 'Generating questions...' : 'Generate practice questions'}
            </button>
            <button
              className="secondary-button"
              onClick={() => handleGeneratePractice('explain')}
              disabled={aiLoading || modelsLoading || !selectedModel?.available}
            >
              {aiLoading && lastMode === 'explain' ? 'Explaining...' : 'Explain this question'}
            </button>
          </div>

          {aiError && (
            <div className="state-box error" role="alert">
              {aiError} <button className="text-button" onClick={() => handleGeneratePractice(lastMode)}>Retry</button>
            </div>
          )}

          {practiceResult && (
            <div className="practice-result" aria-live="polite">
              <p className="small-label">
                {practiceResult.source} / {practiceResult.model}
              </p>
              <h3>{practiceResult.mode === 'explain' ? 'Question explanation' : 'Practice set'}</h3>
              {practiceResult.result?.questions?.length > 0 && (
                <ol className="generated-questions">
                  {practiceResult.result.questions.map((item, index) => (
                    <li key={`${index}-${item}`}>
                      <strong>{item}</strong>
                      {practiceResult.result.explanations?.[index] && (
                        <p>{practiceResult.result.explanations[index]}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              {practiceResult.mode === 'explain' && practiceResult.result?.explanations?.map((item, index) => (
                <p className="answer-explanation" key={`${index}-${item}`}>{item}</p>
              ))}
              <p className="note">{practiceResult.result?.note || 'Sample study content, not official exam material.'}</p>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
