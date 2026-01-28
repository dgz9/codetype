'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getRandomSnippet, languages, type Language, type Snippet } from '@/lib/snippets';

type CharState = 'correct' | 'incorrect' | 'current' | 'pending';

export default function Home() {
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [language, setLanguage] = useState<Language | undefined>(undefined);
  const [input, setInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const containerRef = useRef<HTMLDivElement>(null);

  const startNewGame = useCallback(() => {
    setSnippet(getRandomSnippet(language));
    setInput('');
    setStartTime(null);
    setEndTime(null);
    setWpm(0);
    setAccuracy(100);
  }, [language]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  useEffect(() => {
    containerRef.current?.focus();
  }, [snippet]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!snippet || endTime) return;

    // Start timer on first keypress
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

      // Check if completed
      if (newInput.length === snippet.code.length) {
        const end = Date.now();
        setEndTime(end);
        
        // Calculate WPM (words = chars / 5)
        const timeMinutes = (end - (startTime || end)) / 60000;
        const words = snippet.code.length / 5;
        setWpm(Math.round(words / timeMinutes));

        // Calculate accuracy
        let correct = 0;
        for (let i = 0; i < newInput.length; i++) {
          if (newInput[i] === snippet.code[i]) correct++;
        }
        setAccuracy(Math.round((correct / snippet.code.length) * 100));
      }
    }
  }, [snippet, input, startTime, endTime]);

  const getCharState = (index: number): CharState => {
    if (index >= input.length) {
      return index === input.length ? 'current' : 'pending';
    }
    return input[index] === snippet?.code[index] ? 'correct' : 'incorrect';
  };

  if (!snippet) return null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold mb-2">
          <span className="text-purple-400">Code</span>
          <span className="text-white">Type</span>
        </h1>
        <p className="text-gray-400">Type real code. Get faster.</p>
      </div>

      {/* Language Selector */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        <button
          onClick={() => { setLanguage(undefined); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            !language ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          All
        </button>
        {languages.map((lang) => (
          <button
            key={lang.id}
            onClick={() => setLanguage(lang.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              language === lang.id ? 'text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            style={language === lang.id ? { backgroundColor: lang.color } : {}}
          >
            {lang.name}
          </button>
        ))}
      </div>

      {/* Typing Area */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="w-full max-w-3xl bg-gray-900/80 backdrop-blur border border-gray-700 rounded-xl p-6 sm:p-8 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-text"
      >
        {/* Snippet Info */}
        <div className="flex justify-between items-center mb-4 text-sm text-gray-400">
          <span>{snippet.name}</span>
          <span className={`px-2 py-1 rounded ${
            snippet.difficulty === 'easy' ? 'bg-green-900 text-green-300' :
            snippet.difficulty === 'medium' ? 'bg-yellow-900 text-yellow-300' :
            'bg-red-900 text-red-300'
          }`}>
            {snippet.difficulty}
          </span>
        </div>

        {/* Code Display */}
        <pre className="code-display text-lg sm:text-xl whitespace-pre-wrap break-all">
          {snippet.code.split('').map((char, i) => (
            <span
              key={i}
              className={`char-${getCharState(i)}`}
            >
              {char}
            </span>
          ))}
        </pre>

        {/* Stats */}
        {startTime && (
          <div className="mt-6 pt-4 border-t border-gray-700 flex justify-center gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-purple-400">{wpm || '—'}</div>
              <div className="text-xs text-gray-500">WPM</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{accuracy}%</div>
              <div className="text-xs text-gray-500">Accuracy</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {Math.round((input.length / snippet.code.length) * 100)}%
              </div>
              <div className="text-xs text-gray-500">Progress</div>
            </div>
          </div>
        )}
      </div>

      {/* Completion Screen */}
      {endTime && (
        <div className="mt-6 text-center">
          <div className="text-2xl mb-4">
            {accuracy >= 95 ? '🎉 Perfect!' : accuracy >= 80 ? '👍 Nice!' : '💪 Keep practicing!'}
          </div>
          <button
            onClick={startNewGame}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-all"
          >
            Next Snippet →
          </button>
        </div>
      )}

      {/* Instructions */}
      {!startTime && (
        <p className="mt-6 text-gray-500 text-sm">Click the box and start typing</p>
      )}

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>Made with 🦞 by <a href="https://luke-lobster-site.vercel.app" className="text-purple-400 hover:text-purple-300">Luke</a></p>
      </footer>
    </main>
  );
}
