'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getRandomSnippet, languages, difficulties, type Language, type Difficulty, type Snippet } from '@/lib/snippets';

interface LeaderboardEntry {
  id: number;
  name: string;
  wpm: number;
  accuracy: number;
  mode: string;
  language: string | null;
  created_at: string;
}

type CharState = 'correct' | 'incorrect' | 'current' | 'pending';

interface HighScore {
  wpm: number;
  accuracy: number;
  language: string;
  date: string;
}

type TimedMode = null | 30 | 60 | 120;

interface TimedStats {
  totalChars: number;
  correctChars: number;
  snippetsCompleted: number;
}

export default function Home() {
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [language, setLanguage] = useState<Language | undefined>(undefined);
  const [difficulty, setDifficulty] = useState<Difficulty | undefined>(undefined);
  const [input, setInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [isFocused, setIsFocused] = useState(false);
  const [highScore, setHighScore] = useState<HighScore | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [timedMode, setTimedMode] = useState<TimedMode>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timedStats, setTimedStats] = useState<TimedStats>({ totalChars: 0, correctChars: 0, snippetsCompleted: 0 });
  const [timedEnded, setTimedEnded] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard?limit=10');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    }
  }, []);

  // Load leaderboard and saved name
  useEffect(() => {
    fetchLeaderboard();
    const savedName = localStorage.getItem('codetype-name');
    if (savedName) setPlayerName(savedName);
  }, [fetchLeaderboard]);

  // Submit score to leaderboard
  const submitScore = useCallback(async (finalWpm: number, finalAccuracy: number, mode: string, lang?: string) => {
    if (!playerName.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      localStorage.setItem('codetype-name', playerName.trim());
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: playerName.trim(),
          wpm: finalWpm,
          accuracy: finalAccuracy,
          mode,
          language: lang
        })
      });
      if (res.ok) {
        setSubmitted(true);
        setShowSubmit(false);
        fetchLeaderboard();
      }
    } catch (e) {
      console.error('Failed to submit score:', e);
    }
    setSubmitting(false);
  }, [playerName, submitting, fetchLeaderboard]);

  // Load high score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('codetype-highscore');
    if (saved) {
      setHighScore(JSON.parse(saved));
    }
  }, []);

  const startNewGame = useCallback(() => {
    setSnippet(getRandomSnippet(language, difficulty));
    setInput('');
    setStartTime(null);
    setEndTime(null);
    setWpm(0);
    setAccuracy(100);
    setIsNewHighScore(false);
    setTimedEnded(false);
  }, [language, difficulty]);

  // Start timed challenge
  const startTimedChallenge = useCallback((seconds: TimedMode) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimedMode(seconds);
    setTimeRemaining(seconds);
    setTimedStats({ totalChars: 0, correctChars: 0, snippetsCompleted: 0 });
    setTimedEnded(false);
    startNewGame();
    // Auto-focus typing area
    setTimeout(() => containerRef.current?.focus(), 0);
    if (seconds) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setTimedEnded(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [startNewGame]);

  // Auto-advance to next snippet in timed mode
  const advanceToNextSnippet = useCallback(() => {
    if (snippet && timedMode && !timedEnded) {
      let correct = 0;
      for (let i = 0; i < input.length; i++) {
        if (input[i] === snippet.code[i]) correct++;
      }
      setTimedStats(prev => ({
        totalChars: prev.totalChars + input.length,
        correctChars: prev.correctChars + correct,
        snippetsCompleted: prev.snippetsCompleted + 1
      }));
      setSnippet(getRandomSnippet(language, difficulty));
      setInput('');
    }
  }, [snippet, timedMode, timedEnded, input, language, difficulty]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  useEffect(() => {
    containerRef.current?.focus();
  }, [snippet]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!snippet || endTime || timedEnded) return;

    if (!startTime && e.key.length === 1) {
      setStartTime(Date.now());
    }

    if (e.key === 'Backspace') {
      setInput(prev => prev.slice(0, -1));
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      setInput(prev => prev + '  ');
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      setInput(prev => prev + '\n');
      return;
    }

    if (e.key.length === 1) {
      const newInput = input + e.key;
      setInput(newInput);

      if (newInput.length === snippet.code.length) {
        // Timed mode: auto-advance to next snippet
        if (timedMode && !timedEnded) {
          let correct = 0;
          for (let i = 0; i < newInput.length; i++) {
            if (newInput[i] === snippet.code[i]) correct++;
          }
          setTimedStats(prev => ({
            totalChars: prev.totalChars + newInput.length,
            correctChars: prev.correctChars + correct,
            snippetsCompleted: prev.snippetsCompleted + 1
          }));
          setSnippet(getRandomSnippet(language, difficulty));
          setInput('');
          return;
        }

        // Normal mode: show completion
        const end = Date.now();
        setEndTime(end);
        
        const timeMinutes = (end - (startTime || end)) / 60000;
        const words = snippet.code.length / 5;
        const finalWpm = Math.round(words / timeMinutes);
        setWpm(finalWpm);

        let correct = 0;
        for (let i = 0; i < newInput.length; i++) {
          if (newInput[i] === snippet.code[i]) correct++;
        }
        const finalAccuracy = Math.round((correct / snippet.code.length) * 100);
        setAccuracy(finalAccuracy);

        // Check for high score (must have at least 80% accuracy)
        if (finalAccuracy >= 80) {
          const currentBest = highScore?.wpm || 0;
          if (finalWpm > currentBest) {
            const newHigh: HighScore = {
              wpm: finalWpm,
              accuracy: finalAccuracy,
              language: snippet.language,
              date: new Date().toISOString()
            };
            setHighScore(newHigh);
            setIsNewHighScore(true);
            localStorage.setItem('codetype-highscore', JSON.stringify(newHigh));
          }
        }
      }
    }
  }, [snippet, input, startTime, endTime, timedMode, timedEnded, language, highScore]);

  const getCharState = (index: number): CharState => {
    if (index >= input.length) {
      return index === input.length ? 'current' : 'pending';
    }
    return input[index] === snippet?.code[index] ? 'correct' : 'incorrect';
  };

  const progress = snippet ? Math.round((input.length / snippet.code.length) * 100) : 0;

  if (!snippet) return null;

  return (
    <main className="min-h-screen bg-grid relative">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/5 via-transparent to-pink-900/5 pointer-events-none" />
      
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-2 tracking-tight">
            <span className="text-purple-400">Code</span>
            <span className="text-white">Type</span>
          </h1>
          <p className="text-zinc-500">Type real code. Get faster. Ship more.</p>
          {highScore && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
              <span className="text-yellow-400">🏆</span>
              <span className="text-yellow-400 text-sm font-medium">Best: {highScore.wpm} WPM</span>
            </div>
          )}
          <div className="mt-3">
            <button
              onClick={() => { setShowLeaderboard(!showLeaderboard); if (!showLeaderboard) fetchLeaderboard(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                showLeaderboard
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              🏆 Leaderboard
            </button>
          </div>
        </div>

        {/* Leaderboard */}
        {showLeaderboard && (
          <div className="w-full max-w-md mb-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 fade-in">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>🏆</span> Global Leaderboard
            </h3>
            {leaderboard.length === 0 ? (
              <p className="text-zinc-500 text-center py-4">No scores yet. Be the first!</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <div 
                    key={entry.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      i === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' :
                      i === 1 ? 'bg-zinc-400/10 border border-zinc-400/20' :
                      i === 2 ? 'bg-orange-500/10 border border-orange-500/20' :
                      'bg-zinc-800/50'
                    }`}
                  >
                    <span className={`text-lg font-bold w-6 ${
                      i === 0 ? 'text-yellow-400' :
                      i === 1 ? 'text-zinc-300' :
                      i === 2 ? 'text-orange-400' :
                      'text-zinc-500'
                    }`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{entry.name}</p>
                      <p className="text-xs text-zinc-500">
                        {entry.mode} {entry.language && `• ${entry.language}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-purple-400 font-bold">{entry.wpm} WPM</p>
                      <p className="text-xs text-zinc-500">{entry.accuracy}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mode Selector - Timed Challenges */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <button
            onClick={() => { setTimedMode(null); if (timerRef.current) clearInterval(timerRef.current); setTimeRemaining(null); setTimedEnded(false); startNewGame(); setTimeout(() => containerRef.current?.focus(), 0); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              !timedMode 
                ? 'bg-purple-600 text-white' 
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            📝 Practice
          </button>
          {[30, 60, 120].map((seconds) => (
            <button
              key={seconds}
              onClick={() => startTimedChallenge(seconds as TimedMode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timedMode === seconds 
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white' 
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              ⏱️ {seconds}s
            </button>
          ))}
        </div>

        {/* Timer Display */}
        {timedMode && timeRemaining !== null && (
          <div className={`mb-4 px-6 py-3 rounded-xl text-center ${
            timeRemaining <= 10 
              ? 'bg-red-500/20 border border-red-500/30 animate-pulse' 
              : 'bg-orange-500/20 border border-orange-500/30'
          }`}>
            <div className={`text-3xl font-bold font-mono ${timeRemaining <= 10 ? 'text-red-400' : 'text-orange-400'}`}>
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              {timedStats.snippetsCompleted} snippets • {timedStats.totalChars} chars
            </div>
          </div>
        )}

        {/* Language Selector */}
        <div className="flex flex-wrap justify-center gap-1 mb-6 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <button
            onClick={() => { setLanguage(undefined); setTimeout(() => containerRef.current?.focus(), 0); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              !language 
                ? 'bg-zinc-800 text-white' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All
          </button>
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => { setLanguage(lang.id); setTimeout(() => containerRef.current?.focus(), 0); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                language === lang.id 
                  ? 'bg-zinc-800 text-white' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: lang.color }}
              />
              {lang.name}
            </button>
          ))}
        </div>

        {/* Difficulty Selector */}
        <div className="flex flex-wrap justify-center gap-1 mb-6 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <button
            onClick={() => { setDifficulty(undefined); setTimeout(() => containerRef.current?.focus(), 0); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              !difficulty 
                ? 'bg-zinc-800 text-white' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Any Difficulty
          </button>
          {difficulties.map((diff) => (
            <button
              key={diff.id}
              onClick={() => { setDifficulty(diff.id); setTimeout(() => containerRef.current?.focus(), 0); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                difficulty === diff.id 
                  ? 'bg-zinc-800 text-white' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: diff.color }}
              />
              {diff.label}
            </button>
          ))}
        </div>

        {/* Main Typing Area */}
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="typing-area w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 sm:p-8 focus:outline-none cursor-text glow-purple"
        >
          {/* Snippet Header */}
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <span 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: languages.find(l => l.id === snippet.language)?.color }}
              />
              <span className="text-zinc-400 text-sm font-medium">{snippet.name}</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              snippet.difficulty === 'easy' ? 'badge-easy' :
              snippet.difficulty === 'medium' ? 'badge-medium' :
              'badge-hard'
            }`}>
              {snippet.difficulty}
            </span>
          </div>

          {/* Code Display */}
          <pre className="code-container text-lg sm:text-xl whitespace-pre-wrap break-all min-h-[120px]">
            {snippet.code.split('').map((char, i) => (
              <span key={i} className={`char-${getCharState(i)}`}>
                {char}
              </span>
            ))}
          </pre>

          {/* Progress Bar */}
          <div className="mt-6 pt-4 border-t border-zinc-800">
            <div className="flex justify-between text-xs text-zinc-500 mb-2">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="progress-bar h-full rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Focus hint */}
          {!isFocused && !startTime && (
            <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <p className="text-zinc-400 mb-2">Click here to start typing</p>
                <p className="text-zinc-600 text-sm">
                  <kbd className="kbd">Tab</kbd> for indent • <kbd className="kbd">Enter</kbd> for newline
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        {startTime && (
          <div className="grid grid-cols-3 gap-4 mt-6 w-full max-w-md">
            <div className="stat-card rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-purple-400">{wpm || '—'}</div>
              <div className="text-xs text-zinc-500 mt-1">WPM</div>
            </div>
            <div className="stat-card rounded-xl p-4 text-center">
              <div className={`text-3xl font-bold ${accuracy >= 95 ? 'text-green-400' : accuracy >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                {accuracy}%
              </div>
              <div className="text-xs text-zinc-500 mt-1">Accuracy</div>
            </div>
            <div className="stat-card rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-pink-400">{progress}%</div>
              <div className="text-xs text-zinc-500 mt-1">Complete</div>
            </div>
          </div>
        )}

        {/* Timed Challenge Completion */}
        {timedEnded && timedMode && (() => {
          const finalWpm = timedStats.totalChars > 0 ? Math.round((timedStats.totalChars / 5) / (timedMode / 60)) : 0;
          const finalAcc = timedStats.totalChars > 0 ? Math.round((timedStats.correctChars / timedStats.totalChars) * 100) : 0;
          return (
            <div className="mt-8 text-center completion-enter">
              <div className="text-5xl mb-4">⏱️</div>
              <p className="text-2xl font-bold text-white mb-2">Time's Up!</p>
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto my-6">
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-orange-400">{finalWpm}</div>
                  <div className="text-xs text-zinc-500">WPM</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-green-400">{finalAcc}%</div>
                  <div className="text-xs text-zinc-500">Accuracy</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-pink-400">{timedStats.snippetsCompleted}</div>
                  <div className="text-xs text-zinc-500">Snippets</div>
                </div>
              </div>
              
              {/* Submit to Leaderboard */}
              {finalAcc >= 80 && !submitted && (
                <div className="mb-6 p-4 bg-zinc-800/50 rounded-xl max-w-sm mx-auto">
                  <p className="text-zinc-400 text-sm mb-3">Submit to leaderboard?</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                      placeholder="Your name"
                      maxLength={20}
                      className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => submitScore(finalWpm, finalAcc, `${timedMode}s`)}
                      disabled={!playerName.trim() || submitting}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-all"
                    >
                      {submitting ? '...' : 'Submit'}
                    </button>
                  </div>
                </div>
              )}
              {submitted && (
                <p className="text-green-400 text-sm mb-6">✓ Score submitted!</p>
              )}
              
              <p className="text-zinc-500 mb-6">
                {timedStats.totalChars} characters typed in {timedMode} seconds
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { setSubmitted(false); startTimedChallenge(timedMode); }}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 rounded-xl font-medium text-white transition-all hover:scale-105"
                >
                  🔄 Try Again
                </button>
                <button
                  onClick={() => { setTimedMode(null); setTimeRemaining(null); setTimedEnded(false); setSubmitted(false); startNewGame(); }}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium text-white transition-all"
                >
                  Practice Mode
                </button>
              </div>
            </div>
          );
        })()}

        {/* Normal Completion */}
        {endTime && !timedMode && (
          <div className="mt-8 text-center completion-enter">
            <div className="text-4xl mb-4">
              {isNewHighScore ? '🏆' : accuracy >= 95 ? '🎉' : accuracy >= 80 ? '👍' : '💪'}
            </div>
            <p className="text-xl font-medium text-white mb-2">
              {isNewHighScore ? 'New High Score!' : accuracy >= 95 ? 'Perfect!' : accuracy >= 80 ? 'Nice work!' : 'Keep practicing!'}
            </p>
            <p className="text-zinc-500 mb-4">
              {wpm} WPM with {accuracy}% accuracy
              {isNewHighScore && <span className="text-yellow-400 ml-2">★ Personal Best!</span>}
            </p>
            
            {/* Submit to Leaderboard */}
            {accuracy >= 80 && !submitted && (
              <div className="mb-6 p-4 bg-zinc-800/50 rounded-xl max-w-sm mx-auto">
                <p className="text-zinc-400 text-sm mb-3">Submit to leaderboard?</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                    placeholder="Your name"
                    maxLength={20}
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => submitScore(wpm, accuracy, 'practice', snippet?.language)}
                    disabled={!playerName.trim() || submitting}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-all"
                  >
                    {submitting ? '...' : 'Submit'}
                  </button>
                </div>
              </div>
            )}
            {submitted && (
              <p className="text-green-400 text-sm mb-4">✓ Score submitted!</p>
            )}
            
            <button
              onClick={() => { setSubmitted(false); startNewGame(); }}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-medium text-white transition-all hover:scale-105"
            >
              Next Snippet →
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center">
          <p className="text-zinc-600 text-sm">
            Made with 🦞 by{' '}
            <a 
              href="https://luke-lobster-site.vercel.app" 
              className="text-purple-400 hover:text-purple-300"
              target="_blank"
            >
              Luke
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
