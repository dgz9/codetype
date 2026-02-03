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

interface StreakData {
  currentStreak: number;
  lastPracticeDate: string;
  longestStreak: number;
}

interface WpmEntry {
  wpm: number;
  accuracy: number;
  date: string;
  mode: string;
}

function getWpmHistory(): WpmEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('codetype-wpm-history') || '[]');
  } catch { return []; }
}

function addWpmEntry(entry: WpmEntry): WpmEntry[] {
  const history = getWpmHistory();
  // Keep last 20 entries
  const updated = [...history, entry].slice(-20);
  localStorage.setItem('codetype-wpm-history', JSON.stringify(updated));
  return updated;
}

function getStreakData(): StreakData {
  if (typeof window === 'undefined') return { currentStreak: 0, lastPracticeDate: '', longestStreak: 0 };
  try {
    return JSON.parse(localStorage.getItem('codetype-streak') || '{"currentStreak":0,"lastPracticeDate":"","longestStreak":0}');
  } catch { return { currentStreak: 0, lastPracticeDate: '', longestStreak: 0 }; }
}

function updateStreak(): StreakData {
  const today = new Date().toISOString().split('T')[0];
  const data = getStreakData();
  
  if (data.lastPracticeDate === today) {
    return data; // Already practiced today
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  let newStreak = 1;
  if (data.lastPracticeDate === yesterdayStr) {
    newStreak = data.currentStreak + 1;
  }
  
  const updated: StreakData = {
    currentStreak: newStreak,
    lastPracticeDate: today,
    longestStreak: Math.max(data.longestStreak, newStreak)
  };
  
  localStorage.setItem('codetype-streak', JSON.stringify(updated));
  return updated;
}

type TimedMode = null | 30 | 60 | 120;

interface TimedStats {
  totalChars: number;
  correctChars: number;
  snippetsCompleted: number;
}

// Sound effects using Web Audio API
function createTypingSound(isCorrect: boolean) {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different sounds for correct vs incorrect
    if (isCorrect) {
      oscillator.frequency.value = 800 + Math.random() * 200; // Higher pitch for correct
      oscillator.type = 'sine';
      gainNode.gain.value = 0.03;
    } else {
      oscillator.frequency.value = 200 + Math.random() * 100; // Lower pitch for error
      oscillator.type = 'square';
      gainNode.gain.value = 0.05;
    }
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);
    oscillator.stop(audioContext.currentTime + 0.08);
  } catch (e) {
    // Audio not available
  }
}

function getSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('codetype-sound') === 'true';
}

function setSoundEnabled(enabled: boolean) {
  localStorage.setItem('codetype-sound', enabled ? 'true' : 'false');
}

// Keyboard heatmap types
interface KeyStats {
  correct: number;
  incorrect: number;
}

type KeyHeatmap = Record<string, KeyStats>;

// Keyboard layout for heatmap display
const keyboardRows = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
];

function getKeyAccuracy(stats: KeyStats | undefined): 'neutral' | 'perfect' | 'good' | 'okay' | 'poor' {
  if (!stats || (stats.correct === 0 && stats.incorrect === 0)) return 'neutral';
  const total = stats.correct + stats.incorrect;
  const accuracy = stats.correct / total;
  if (accuracy >= 0.95) return 'perfect';
  if (accuracy >= 0.8) return 'good';
  if (accuracy >= 0.6) return 'okay';
  return 'poor';
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
  const [streak, setStreak] = useState<StreakData>({ currentStreak: 0, lastPracticeDate: '', longestStreak: 0 });
  const [showStreakUpdate, setShowStreakUpdate] = useState(false);
  const [wpmHistory, setWpmHistory] = useState<WpmEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [soundEnabled, setSoundState] = useState(false);
  const [keyHeatmap, setKeyHeatmap] = useState<KeyHeatmap>({});
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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

  // Load leaderboard, saved name, streak, WPM history, and sound preference
  useEffect(() => {
    fetchLeaderboard();
    const savedName = localStorage.getItem('codetype-name');
    if (savedName) setPlayerName(savedName);
    setStreak(getStreakData());
    setWpmHistory(getWpmHistory());
    setSoundState(getSoundEnabled());
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
    setKeyHeatmap({});
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

  // Update streak and WPM history when timed challenge ends
  useEffect(() => {
    if (timedEnded && timedStats.snippetsCompleted > 0 && timedMode) {
      const newStreak = updateStreak();
      if (newStreak.currentStreak > streak.currentStreak) {
        setShowStreakUpdate(true);
        setTimeout(() => setShowStreakUpdate(false), 2000);
      }
      setStreak(newStreak);
      
      // Add to WPM history
      const finalWpm = Math.round((timedStats.totalChars / 5) / (timedMode / 60));
      const finalAcc = Math.round((timedStats.correctChars / timedStats.totalChars) * 100);
      const entry: WpmEntry = {
        wpm: finalWpm,
        accuracy: finalAcc,
        date: new Date().toISOString(),
        mode: `${timedMode}s`
      };
      setWpmHistory(addWpmEntry(entry));
    }
  }, [timedEnded]);

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
      
      // Track key accuracy for heatmap
      const expectedKey = snippet.code[input.length];
      const isCorrect = e.key === expectedKey;
      
      // Update heatmap stats for the pressed key
      setKeyHeatmap(prev => {
        const keyLower = e.key.toLowerCase();
        const existing = prev[keyLower] || { correct: 0, incorrect: 0 };
        return {
          ...prev,
          [keyLower]: {
            correct: existing.correct + (isCorrect ? 1 : 0),
            incorrect: existing.incorrect + (isCorrect ? 0 : 1)
          }
        };
      });
      
      // Play sound effect
      if (soundEnabled) {
        createTypingSound(isCorrect);
      }

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

        // Update streak on completion
        const newStreak = updateStreak();
        if (newStreak.currentStreak > streak.currentStreak) {
          setShowStreakUpdate(true);
          setTimeout(() => setShowStreakUpdate(false), 2000);
        }
        setStreak(newStreak);

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

        // Add to WPM history
        const entry: WpmEntry = {
          wpm: finalWpm,
          accuracy: finalAccuracy,
          date: new Date().toISOString(),
          mode: 'practice'
        };
        setWpmHistory(addWpmEntry(entry));
      }
    }
  }, [snippet, input, startTime, endTime, timedMode, timedEnded, language, highScore, soundEnabled]);

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
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {highScore && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                <span className="text-yellow-400">🏆</span>
                <span className="text-yellow-400 text-sm font-medium">Best: {highScore.wpm} WPM</span>
              </div>
            )}
            {streak.currentStreak > 0 && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                showStreakUpdate
                  ? 'bg-orange-500/20 border-orange-500/40 scale-110'
                  : 'bg-orange-500/10 border-orange-500/20'
              }`}>
                <span className="text-orange-400">🔥</span>
                <span className="text-orange-400 text-sm font-medium">
                  {streak.currentStreak} day{streak.currentStreak !== 1 ? 's' : ''}
                </span>
                {streak.longestStreak > streak.currentStreak && (
                  <span className="text-orange-400/60 text-xs">(best: {streak.longestStreak})</span>
                )}
              </div>
            )}
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

        {/* WPM History Chart */}
        {showHistory && (
          <div className="w-full max-w-lg mb-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 fade-in">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>📈</span> Your WPM Progress
            </h3>
            {wpmHistory.length === 0 ? (
              <p className="text-zinc-500 text-center py-4">Complete some typing sessions to see your progress!</p>
            ) : (
              <>
                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-purple-400">
                      {Math.round(wpmHistory.reduce((sum, e) => sum + e.wpm, 0) / wpmHistory.length)}
                    </div>
                    <div className="text-xs text-zinc-500">Avg WPM</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-green-400">
                      {Math.max(...wpmHistory.map(e => e.wpm))}
                    </div>
                    <div className="text-xs text-zinc-500">Best WPM</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-pink-400">
                      {wpmHistory.length}
                    </div>
                    <div className="text-xs text-zinc-500">Sessions</div>
                  </div>
                </div>
                
                {/* Bar Chart */}
                <div className="relative h-32 flex items-end gap-1">
                  {(() => {
                    const maxWpm = Math.max(...wpmHistory.map(e => e.wpm), 1);
                    return wpmHistory.slice(-15).map((entry, i) => {
                      const height = (entry.wpm / maxWpm) * 100;
                      const isRecent = i === wpmHistory.slice(-15).length - 1;
                      return (
                        <div
                          key={i}
                          className="flex-1 group relative"
                          title={`${entry.wpm} WPM • ${entry.accuracy}% • ${entry.mode}`}
                        >
                          <div
                            className={`w-full rounded-t transition-all ${
                              isRecent 
                                ? 'bg-gradient-to-t from-purple-600 to-pink-500' 
                                : entry.accuracy >= 95 
                                  ? 'bg-green-500/60 hover:bg-green-500/80' 
                                  : entry.accuracy >= 80 
                                    ? 'bg-purple-500/60 hover:bg-purple-500/80'
                                    : 'bg-orange-500/60 hover:bg-orange-500/80'
                            }`}
                            style={{ height: `${height}%` }}
                          />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {entry.wpm} WPM
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="flex justify-between text-xs text-zinc-600 mt-2">
                  <span>← Older</span>
                  <span>Recent →</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Keyboard Heatmap */}
        {showHeatmap && (
          <div className="w-full max-w-xl mb-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 fade-in">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>⌨️</span> Keyboard Heatmap
              {Object.keys(keyHeatmap).length === 0 && (
                <span className="text-xs text-zinc-500 font-normal">Start typing to see accuracy</span>
              )}
            </h3>
            <div className="flex flex-col items-center gap-1">
              {keyboardRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1" style={{ marginLeft: rowIndex === 1 ? '20px' : rowIndex === 2 ? '30px' : rowIndex === 3 ? '50px' : '0' }}>
                  {row.map((key) => {
                    const stats = keyHeatmap[key.toLowerCase()];
                    const accuracyClass = getKeyAccuracy(stats);
                    const total = stats ? stats.correct + stats.incorrect : 0;
                    const pct = stats && total > 0 ? Math.round((stats.correct / total) * 100) : null;
                    return (
                      <div
                        key={key}
                        className={`keyboard-key ${accuracyClass}`}
                        title={stats ? `${pct}% accuracy (${stats.correct}/${total})` : 'No data'}
                      >
                        {key.toUpperCase()}
                      </div>
                    );
                  })}
                </div>
              ))}
              {/* Space bar */}
              <div className="flex gap-1 mt-1">
                <div
                  className={`keyboard-key ${getKeyAccuracy(keyHeatmap[' '])} px-16`}
                  style={{ minWidth: '200px' }}
                  title={keyHeatmap[' '] ? `${Math.round((keyHeatmap[' '].correct / (keyHeatmap[' '].correct + keyHeatmap[' '].incorrect)) * 100)}% accuracy` : 'No data'}
                >
                  SPACE
                </div>
              </div>
            </div>
            {/* Legend */}
            <div className="flex justify-center gap-4 mt-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/30"></span> 95%+</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/15"></span> 80%+</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/20"></span> 60%+</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/25"></span> &lt;60%</span>
            </div>
          </div>
        )}

        {/* Unified Control Bar */}
        <div className="w-full max-w-3xl mb-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
          {/* Top Row: Mode + Timer + Utilities */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Mode Selector */}
            <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-lg">
              <button
                onClick={() => { setTimedMode(null); if (timerRef.current) clearInterval(timerRef.current); setTimeRemaining(null); setTimedEnded(false); startNewGame(); setTimeout(() => containerRef.current?.focus(), 0); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  !timedMode 
                    ? 'bg-purple-600 text-white' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Practice
              </button>
              {[30, 60, 120].map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => startTimedChallenge(seconds as TimedMode)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    timedMode === seconds 
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {seconds}s
                </button>
              ))}
            </div>

            {/* Timer Display (inline) */}
            {timedMode && timeRemaining !== null && (
              <div className={`px-4 py-1.5 rounded-lg text-center ${
                timeRemaining <= 10 
                  ? 'bg-red-500/20 border border-red-500/30 animate-pulse' 
                  : 'bg-orange-500/20 border border-orange-500/30'
              }`}>
                <span className={`text-xl font-bold font-mono ${timeRemaining <= 10 ? 'text-red-400' : 'text-orange-400'}`}>
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </span>
                <span className="text-xs text-zinc-400 ml-2">
                  {timedStats.snippetsCompleted} done
                </span>
              </div>
            )}

            {/* Utility Buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => { setShowLeaderboard(!showLeaderboard); if (!showLeaderboard) fetchLeaderboard(); setShowHistory(false); setShowHeatmap(false); }}
                className={`p-2 rounded-lg text-sm transition-all ${
                  showLeaderboard ? 'bg-purple-600 text-white' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
                }`}
                title="Leaderboard"
              >
                🏆
              </button>
              <button
                onClick={() => { setShowHistory(!showHistory); setShowLeaderboard(false); setShowHeatmap(false); }}
                className={`p-2 rounded-lg text-sm transition-all ${
                  showHistory ? 'bg-pink-600 text-white' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
                }`}
                title="My Progress"
              >
                📈
              </button>
              <button
                onClick={() => { setShowHeatmap(!showHeatmap); setShowLeaderboard(false); setShowHistory(false); }}
                className={`p-2 rounded-lg text-sm transition-all ${
                  showHeatmap ? 'bg-orange-600 text-white' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
                }`}
                title="Keyboard Heatmap"
              >
                ⌨️
              </button>
              <button
                onClick={() => { 
                  const newState = !soundEnabled; 
                  setSoundState(newState); 
                  setSoundEnabled(newState);
                  if (newState) createTypingSound(true);
                }}
                className={`p-2 rounded-lg text-sm transition-all ${
                  soundEnabled ? 'bg-green-600 text-white' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
                }`}
                title={soundEnabled ? 'Sound On' : 'Sound Off'}
              >
                {soundEnabled ? '🔊' : '🔇'}
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg text-sm transition-all ${
                  showSettings ? 'bg-zinc-600 text-white' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
                }`}
                title="Filters"
              >
                ⚙️
              </button>
            </div>
          </div>

          {/* Expandable Filters */}
          {showSettings && (
            <div className="pt-3 border-t border-zinc-800 space-y-2 fade-in">
              {/* Language Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-500 w-16">Language:</span>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => { setLanguage(undefined); setTimeout(() => containerRef.current?.focus(), 0); }}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                      !language ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    All
                  </button>
                  {languages.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => { setLanguage(lang.id); setTimeout(() => containerRef.current?.focus(), 0); }}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                        language === lang.id ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lang.color }} />
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>
              {/* Difficulty Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-500 w-16">Difficulty:</span>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => { setDifficulty(undefined); setTimeout(() => containerRef.current?.focus(), 0); }}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                      !difficulty ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Any
                  </button>
                  {difficulties.map((diff) => (
                    <button
                      key={diff.id}
                      onClick={() => { setDifficulty(diff.id); setTimeout(() => containerRef.current?.focus(), 0); }}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                        difficulty === diff.id ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: diff.color }} />
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Typing Area */}
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="typing-area relative w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 sm:p-8 focus:outline-none cursor-text glow-purple"
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
