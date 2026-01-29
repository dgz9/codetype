'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getRandomSnippet, languages, type Language, type Snippet } from '@/lib/snippets';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load high score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('codetype-highscore');
    if (saved) {
      setHighScore(JSON.parse(saved));
    }
  }, []);

  const startNewGame = useCallback(() => {
    setSnippet(getRandomSnippet(language));
    setInput('');
    setStartTime(null);
    setEndTime(null);
    setWpm(0);
    setAccuracy(100);
    setIsNewHighScore(false);
    setTimedEnded(false);
  }, [language]);

  // Start timed challenge
  const startTimedChallenge = useCallback((seconds: TimedMode) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimedMode(seconds);
    setTimeRemaining(seconds);
    setTimedStats({ totalChars: 0, correctChars: 0, snippetsCompleted: 0 });
    setTimedEnded(false);
    startNewGame();
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
      setSnippet(getRandomSnippet(language));
      setInput('');
    }
  }, [snippet, timedMode, timedEnded, input, language]);

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
          setSnippet(getRandomSnippet(language));
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
        </div>

        {/* Mode Selector - Timed Challenges */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <button
            onClick={() => { setTimedMode(null); if (timerRef.current) clearInterval(timerRef.current); setTimeRemaining(null); setTimedEnded(false); startNewGame(); }}
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
            onClick={() => setLanguage(undefined)}
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
              onClick={() => setLanguage(lang.id)}
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
        {timedEnded && timedMode && (
          <div className="mt-8 text-center completion-enter">
            <div className="text-5xl mb-4">⏱️</div>
            <p className="text-2xl font-bold text-white mb-2">Time's Up!</p>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto my-6">
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <div className="text-2xl font-bold text-orange-400">
                  {timedStats.totalChars > 0 ? Math.round((timedStats.totalChars / 5) / (timedMode / 60)) : 0}
                </div>
                <div className="text-xs text-zinc-500">WPM</div>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <div className="text-2xl font-bold text-green-400">
                  {timedStats.totalChars > 0 ? Math.round((timedStats.correctChars / timedStats.totalChars) * 100) : 0}%
                </div>
                <div className="text-xs text-zinc-500">Accuracy</div>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <div className="text-2xl font-bold text-pink-400">{timedStats.snippetsCompleted}</div>
                <div className="text-xs text-zinc-500">Snippets</div>
              </div>
            </div>
            <p className="text-zinc-500 mb-6">
              {timedStats.totalChars} characters typed in {timedMode} seconds
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => startTimedChallenge(timedMode)}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 rounded-xl font-medium text-white transition-all hover:scale-105"
              >
                🔄 Try Again
              </button>
              <button
                onClick={() => { setTimedMode(null); setTimeRemaining(null); setTimedEnded(false); startNewGame(); }}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium text-white transition-all"
              >
                Practice Mode
              </button>
            </div>
          </div>
        )}

        {/* Normal Completion */}
        {endTime && !timedMode && (
          <div className="mt-8 text-center completion-enter">
            <div className="text-4xl mb-4">
              {isNewHighScore ? '🏆' : accuracy >= 95 ? '🎉' : accuracy >= 80 ? '👍' : '💪'}
            </div>
            <p className="text-xl font-medium text-white mb-2">
              {isNewHighScore ? 'New High Score!' : accuracy >= 95 ? 'Perfect!' : accuracy >= 80 ? 'Nice work!' : 'Keep practicing!'}
            </p>
            <p className="text-zinc-500 mb-6">
              {wpm} WPM with {accuracy}% accuracy
              {isNewHighScore && <span className="text-yellow-400 ml-2">★ Personal Best!</span>}
            </p>
            <button
              onClick={startNewGame}
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
