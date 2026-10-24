import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

  useEffect(() => {
    fetchQuestions();
  }, []);

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

  const handleGeneratePractice = async () => {
    const trimmed = aiInput.trim();
    if (!trimmed) {
      setAiError('Please enter a question or click a question card to reuse it.');
      return;
    }

    try {
      setAiLoading(true);
      setAiError('');

      const response = await fetch(`${API_URL}/api/practice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: aiSubject,
          question: trimmed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'AI practice generation failed.');
      }

      setPracticeResult(data.result || null);
    } catch (err) {
      setAiError(err.message || 'Unexpected error while generating practice.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">University study assistant</p>
          <h1>PaperPilot</h1>
        </div>
        <div className="status-pill">Demo data only</div>
      </header>

      <main className="layout">
        <section className="panel">
          <div className="panel-header">
            <h2>Question Bank</h2>
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

        <aside className="panel ai-panel">
          <div className="panel-header compact">
            <h2>AI Practice</h2>
            <span className="badge success">Groq powered</span>
          </div>

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
              rows={7}
            />
          </label>

          <button className="primary-button" onClick={handleGeneratePractice} disabled={aiLoading}>
            {aiLoading ? 'Generating...' : 'Generate practice'}
          </button>

          {aiError && <div className="state-box error">{aiError}</div>}

          {practiceResult && (
            <div className="practice-result">
              <p className="small-label">Sample study content generated via Groq</p>
              <h3>Practice set</h3>
              <ul>
                {(practiceResult.questions || []).map((item, index) => (
                  <li key={index}>
                    <strong>Q{index + 1}:</strong> {item}
                    <p>{practiceResult.explanations?.[index] || 'Explanation coming soon.'}</p>
                  </li>
                ))}
              </ul>
              <p className="note">{practiceResult.note || 'This is sample practice content for study use.'}</p>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
