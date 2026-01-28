import { useState, useEffect } from 'react';
import './App.css';

interface Answer {
  text: string;
  isCorrect: boolean;
}

interface Question {
  id?: string;
  question: string;
  answers: Answer[];
  shuffledIndices?: number[];
}

function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Map<number, number[]>>(new Map());
  const [incorrectQuestionIds, setIncorrectQuestionIds] = useState<Set<string>>(new Set());
  const [reviewMode, setReviewMode] = useState(false);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);

  const generateQuestionId = (question: Question, index: number): string => {
    return `q_${index}_${question.question.substring(0, 50)}`;
  };

  const shuffleAnswers = (question: Question): Question => {
    const indices = question.answers.map((_, i) => i);
    const shuffledIndices = [...indices].sort(() => Math.random() - 0.5);
    return { ...question, shuffledIndices };
  };

  useEffect(() => {
    fetch('/questions/questions.json')
      .then(res => res.json())
      .then(data => {
        const questionsWithIds = data.map((q: Question, i: number) => ({
          ...q,
          id: generateQuestionId(q, i)
        }));
        const questionsWithShuffledAnswers = questionsWithIds.map((q: Question) => shuffleAnswers(q));
        setQuestions(questionsWithShuffledAnswers);
        setAllQuestions(questionsWithShuffledAnswers);
      })
      .catch(err => console.error('Błąd wczytywania pytań:', err));
  }, []);

  const shuffleQuestions = () => {
    const shuffledQuestions = [...allQuestions].sort(() => Math.random() - 0.5)
      .map(q => shuffleAnswers(q));
    setQuestions(shuffledQuestions);
    setCurrentIndex(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setUserAnswers(new Map());
  };

  const resetQuiz = () => {
    setCurrentIndex(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setUserAnswers(new Map());
    setIncorrectQuestionIds(new Set());
    setReviewMode(false);
    fetch('/questions/questions.json')
      .then(res => res.json())
      .then(data => {
        const questionsWithIds = data.map((q: Question, i: number) => ({
          ...q,
          id: generateQuestionId(q, i)
        }));
        const questionsWithShuffledAnswers = questionsWithIds.map((q: Question) => shuffleAnswers(q));
        setQuestions(questionsWithShuffledAnswers);
        setAllQuestions(questionsWithShuffledAnswers);
      })
      .catch(err => console.error('Błąd wczytywania pytań:', err));
  };

  const handleAnswerToggle = (answerIndex: number) => {
    if (showResults) return;

    if (selectedAnswers.includes(answerIndex)) {
      setSelectedAnswers(selectedAnswers.filter(i => i !== answerIndex));
    } else {
      setSelectedAnswers([...selectedAnswers, answerIndex]);
    }
  };

  const handleCheckAnswer = () => {
    const newUserAnswers = new Map(userAnswers);
    newUserAnswers.set(currentIndex, selectedAnswers);
    setUserAnswers(newUserAnswers);

    // Sprawdź czy odpowiedź jest poprawna
    const correctAnswers = currentQuestion.answers
      .map((a, i) => a.isCorrect ? i : -1)
      .filter(i => i !== -1);

    const isCorrect =
      selectedAnswers.length === correctAnswers.length &&
      selectedAnswers.every(a => correctAnswers.includes(a));

    // Dodaj do zbioru błędnych jeśli niepoprawna (używając ID pytania)
    if (!isCorrect && currentQuestion.id) {
      setIncorrectQuestionIds(prev => new Set(prev).add(currentQuestion.id!));
    }

    setShowResults(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswers(userAnswers.get(currentIndex + 1) || []);
      setShowResults(userAnswers.has(currentIndex + 1));
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedAnswers(userAnswers.get(currentIndex - 1) || []);
      setShowResults(userAnswers.has(currentIndex - 1));
    }
  };

  const startReviewMode = () => {
    if (incorrectQuestionIds.size === 0) return;

    const incorrectQuestions = allQuestions.filter(q =>
      q.id && incorrectQuestionIds.has(q.id)
    );

    setQuestions(incorrectQuestions);
    setReviewMode(true);
    setCurrentIndex(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setUserAnswers(new Map());
  };

  const exitReviewMode = () => {
    setQuestions(allQuestions);
    setReviewMode(false);
    setCurrentIndex(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setUserAnswers(new Map());
  };

  const calculateScore = () => {
    let correct = 0;
    let answered = 0;

    userAnswers.forEach((answers, questionIndex) => {
      const question = questions[questionIndex];
      const correctAnswers = question.answers
        .map((a, i) => a.isCorrect ? i : -1)
        .filter(i => i !== -1);

      const isCorrect =
        answers.length === correctAnswers.length &&
        answers.every(a => correctAnswers.includes(a));

      if (isCorrect) correct++;
      answered++;
    });

    return { correct, answered, total: questions.length };
  };

  if (questions.length === 0) {
    return (
      <div className="container mt-5">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const score = calculateScore();

  const shuffledIndices = currentQuestion.shuffledIndices || currentQuestion.answers.map((_, i) => i);
  const shuffledAnswers = shuffledIndices.map(i => ({ ...currentQuestion.answers[i], originalIndex: i }));

  const correctAnswerIndices = currentQuestion.answers
    .map((a, i) => a.isCorrect ? i : -1)
    .filter(i => i !== -1);

  return (
    <div className="container py-3" style={{ maxWidth: '700px' }}>
      <div className="row justify-content-center">
        <div className="col-12">
          <div className="card shadow">
            <div className="card-header" style={{ background: '#34495e', color: 'white' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h3 className="mb-0">
                  {reviewMode ? '🔄 Powtórka błędnych' : 'Quiz - Obrazy'}
                </h3>
                <div className="btn-group">
                  <button
                    className="btn btn-light btn-sm"
                    onClick={shuffleQuestions}
                    title="Losuj pytania"
                  >
                    🔀 Losuj
                  </button>
                  <button
                    className="btn btn-light btn-sm"
                    onClick={resetQuiz}
                    title="Reset"
                  >
                    🔄 Reset
                  </button>
                </div>
              </div>
            </div>

            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="badge bg-secondary">
                    Pytanie {currentIndex + 1} z {questions.length}
                  </span>
                  <span className="badge bg-success">
                    Wynik: {score.correct}/{score.answered} (z {score.total})
                  </span>
                </div>
                <div className="progress" style={{ height: '10px' }}>
                  <div
                    className="progress-bar"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              <h5 className="mb-4">{currentQuestion.question}</h5>

              <div className="mb-4">
                {shuffledAnswers.map((answer, shuffledIndex) => {
                  const originalIndex = answer.originalIndex;
                  const isSelected = selectedAnswers.includes(originalIndex);
                  const isCorrect = correctAnswerIndices.includes(originalIndex);

                  let btnClass = 'btn btn-outline-primary w-100 text-start mb-3';

                  if (showResults) {
                    if (isCorrect) {
                      btnClass = 'btn btn-success w-100 text-start mb-3';
                    } else if (isSelected && !isCorrect) {
                      btnClass = 'btn btn-danger w-100 text-start mb-3';
                    } else {
                      btnClass = 'btn btn-outline-secondary w-100 text-start mb-3';
                    }
                  } else if (isSelected) {
                    btnClass = 'btn btn-primary w-100 text-start mb-3';
                  }

                  return (
                    <button
                      key={shuffledIndex}
                      className={btnClass}
                      onClick={() => handleAnswerToggle(originalIndex)}
                      disabled={showResults}
                      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                    >
                      <span className="me-2">
                        {showResults ? (
                          isCorrect ? '✓' : (isSelected ? '✗' : '○')
                        ) : (
                          isSelected ? '☑' : '☐'
                        )}
                      </span>
                      {answer.text}
                    </button>
                  );
                })}
              </div>

              {showResults && (
                <div className={`alert ${selectedAnswers.length === correctAnswerIndices.length &&
                  selectedAnswers.every(a => correctAnswerIndices.includes(a))
                  ? 'alert-success'
                  : 'alert-danger'
                  }`}>
                  {selectedAnswers.length === correctAnswerIndices.length &&
                    selectedAnswers.every(a => correctAnswerIndices.includes(a))
                    ? '✓ Poprawna odpowiedź!'
                    : '✗ Niepoprawna odpowiedź. Poprawne odpowiedzi są zaznaczone na zielono.'}
                </div>
              )}

              <div className="d-flex justify-content-between gap-2">
                <button
                  className="btn btn-secondary"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                >
                  ← Poprzednie
                </button>

                {!showResults ? (
                  <button
                    className="btn btn-success"
                    onClick={handleCheckAnswer}
                    disabled={selectedAnswers.length === 0}
                  >
                    Sprawdź odpowiedź
                  </button>
                ) : (
                  <button
                    className="btn btn-info text-white"
                    onClick={() => {
                      setSelectedAnswers([]);
                      setShowResults(false);
                      const newUserAnswers = new Map(userAnswers);
                      newUserAnswers.delete(currentIndex);
                      setUserAnswers(newUserAnswers);
                    }}
                  >
                    Spróbuj ponownie
                  </button>
                )}

                <button
                  className="btn btn-secondary"
                  onClick={handleNext}
                  disabled={currentIndex === questions.length - 1}
                >
                  Następne →
                </button>
              </div>
            </div>

            <div className="card-footer text-muted">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <small>
                  Odpowiedziano na {score.answered} z {score.total} pytań
                  {score.answered > 0 && ` • Poprawność: ${Math.round((score.correct / score.answered) * 100)}%`}
                </small>
                {!reviewMode && incorrectQuestionIds.size > 0 && (
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={startReviewMode}
                  >
                    🔄 Powtórz błędne ({incorrectQuestionIds.size})
                  </button>
                )}
                {reviewMode && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={exitReviewMode}
                  >
                    ← Powrót do wszystkich pytań
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
