'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getRandomSnippet, languages, difficulties, createCustomSnippet, getSavedCustomSnippets, saveCustomSnippet, deleteCustomSnippet, getDailyChallenge, getDailyChallengeDate, getDailyBest, saveDailyBest, type Language, type Difficulty, type Snippet, type DailyBest } from '@/lib/snippets';

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

// Achievement system
interface Achievement {
  id: string;
  name: string;
  emoji: string;
  description: string;
  condition: (stats: AchievementStats) => boolean;
}

interface AchievementStats {
  totalSessions: number;
  bestWpm: number;
  bestAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  perfectSessions: number; // 100% accuracy
  speedDemonSessions: number; // 100+ WPM
  totalCharsTyped: number;
}

const achievements: Achievement[] = [
  { id: 'first-steps', name: 'First Steps', emoji: '👶', description: 'Complete your first typing session', condition: (s) => s.totalSessions >= 1 },
  { id: 'getting-started', name: 'Getting Started', emoji: '🚀', description: 'Complete 5 typing sessions', condition: (s) => s.totalSessions >= 5 },
  { id: 'dedicated', name: 'Dedicated Typist', emoji: '💪', description: 'Complete 25 typing sessions', condition: (s) => s.totalSessions >= 25 },
  { id: 'centurion', name: 'Centurion', emoji: '🏛️', description: 'Complete 100 typing sessions', condition: (s) => s.totalSessions >= 100 },
  { id: 'speed-50', name: 'Warming Up', emoji: '🔥', description: 'Reach 50 WPM', condition: (s) => s.bestWpm >= 50 },
  { id: 'speed-75', name: 'Getting Fast', emoji: '⚡', description: 'Reach 75 WPM', condition: (s) => s.bestWpm >= 75 },
  { id: 'speed-100', name: 'Speed Demon', emoji: '👹', description: 'Reach 100 WPM', condition: (s) => s.bestWpm >= 100 },
  { id: 'speed-150', name: 'Lightning Fingers', emoji: '🌩️', description: 'Reach 150 WPM', condition: (s) => s.bestWpm >= 150 },
  { id: 'perfectionist', name: 'Perfectionist', emoji: '✨', description: 'Get 100% accuracy in a session', condition: (s) => s.perfectSessions >= 1 },
  { id: 'flawless-5', name: 'Flawless Five', emoji: '💎', description: 'Get 100% accuracy 5 times', condition: (s) => s.perfectSessions >= 5 },
  { id: 'streak-3', name: 'On a Roll', emoji: '🎯', description: '3 day practice streak', condition: (s) => s.longestStreak >= 3 },
  { id: 'streak-7', name: 'Weekly Warrior', emoji: '🗓️', description: '7 day practice streak', condition: (s) => s.longestStreak >= 7 },
  { id: 'streak-30', name: 'Monthly Master', emoji: '📅', description: '30 day practice streak', condition: (s) => s.longestStreak >= 30 },
  { id: 'marathon', name: 'Marathon Typist', emoji: '🏃', description: 'Type 10,000 characters total', condition: (s) => s.totalCharsTyped >= 10000 },
  { id: 'novelist', name: 'Novelist', emoji: '📚', description: 'Type 50,000 characters total', condition: (s) => s.totalCharsTyped >= 50000 },
];

function getAchievementStats(): AchievementStats {
  if (typeof window === 'undefined') return { totalSessions: 0, bestWpm: 0, bestAccuracy: 0, currentStreak: 0, longestStreak: 0, perfectSessions: 0, speedDemonSessions: 0, totalCharsTyped: 0 };
  try {
    return JSON.parse(localStorage.getItem('codetype-achievement-stats') || '{"totalSessions":0,"bestWpm":0,"bestAccuracy":0,"currentStreak":0,"longestStreak":0,"perfectSessions":0,"speedDemonSessions":0,"totalCharsTyped":0}');
  } catch { return { totalSessions: 0, bestWpm: 0, bestAccuracy: 0, currentStreak: 0, longestStreak: 0, perfectSessions: 0, speedDemonSessions: 0, totalCharsTyped: 0 }; }
}

function updateAchievementStats(wpm: number, accuracy: number, charsTyped: number, streak: StreakData): AchievementStats {
  const stats = getAchievementStats();
  const updated: AchievementStats = {
    totalSessions: stats.totalSessions + 1,
    bestWpm: Math.max(stats.bestWpm, wpm),
    bestAccuracy: Math.max(stats.bestAccuracy, accuracy),
    currentStreak: streak.currentStreak,
    longestStreak: Math.max(stats.longestStreak, streak.longestStreak),
    perfectSessions: stats.perfectSessions + (accuracy === 100 ? 1 : 0),
    speedDemonSessions: stats.speedDemonSessions + (wpm >= 100 ? 1 : 0),
    totalCharsTyped: stats.totalCharsTyped + charsTyped,
  };
  localStorage.setItem('codetype-achievement-stats', JSON.stringify(updated));
  return updated;
}

function getUnlockedAchievements(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('codetype-unlocked-achievements') || '[]');
  } catch { return []; }
}

function saveUnlockedAchievements(ids: string[]) {
  localStorage.setItem('codetype-unlocked-achievements', JSON.stringify(ids));
}

function checkNewAchievements(stats: AchievementStats, currentUnlocked: string[]): Achievement[] {
  const newlyUnlocked: Achievement[] = [];
  for (const achievement of achievements) {
    if (!currentUnlocked.includes(achievement.id) && achievement.condition(stats)) {
      newlyUnlocked.push(achievement);
    }
  }
  return newlyUnlocked;
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
  const [focusMode, setFocusMode] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [customName, setCustomName] = useState('');
  const [savedCustomSnippets, setSavedCustomSnippets] = useState<{ code: string; name: string }[]>([]);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [achievementStats, setAchievementStats] = useState<AchievementStats>({ totalSessions: 0, bestWpm: 0, bestAccuracy: 0, currentStreak: 0, longestStreak: 0, perfectSessions: 0, speedDemonSessions: 0, totalCharsTyped: 0 });
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [dailyMode, setDailyMode] = useState(false);
  const [dailyBest, setDailyBest] = useState<DailyBest | null>(null);
  const [showDailyComplete, setShowDailyComplete] = useState(false);
  const [dailyResult, setDailyResult] = useState<{ wpm: number; accuracy: number; isNewBest: boolean } | null>(null);
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

  // Load leaderboard, saved name, streak, WPM history, sound preference, custom snippets, achievements, and daily best
  useEffect(() => {
    fetchLeaderboard();
    const savedName = localStorage.getItem('codetype-name');
    if (savedName) setPlayerName(savedName);
    setStreak(getStreakData());
    setWpmHistory(getWpmHistory());
    setSoundState(getSoundEnabled());
    setSavedCustomSnippets(getSavedCustomSnippets());
    setAchievementStats(getAchievementStats());
    setUnlockedAchievements(getUnlockedAchievements());
    setDailyBest(getDailyBest());
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
    setDailyMode(false);
    setShowDailyComplete(false);
    setDailyResult(null);
  }, [language, difficulty]);

  // Start Daily Challenge
  const startDailyChallenge = useCallback(() => {
    const dailySnippet = getDailyChallenge();
    setSnippet(dailySnippet);
    setInput('');
    setStartTime(null);
    setEndTime(null);
    setWpm(0);
    setAccuracy(100);
    setIsNewHighScore(false);
    setTimedEnded(false);
    setKeyHeatmap({});
    setDailyMode(true);
    setTimedMode(null);
    setIsCustomMode(false);
    setShowDailyComplete(false);
    setDailyResult(null);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeRemaining(null);
    setTimeout(() => containerRef.current?.focus(), 0);
  }, []);

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

  // Start custom snippet
  const startCustomSnippet = useCallback((code: string, name?: string) => {
    if (!code.trim()) return;
    const customSnippet = createCustomSnippet(code, name);
    setSnippet(customSnippet);
    setInput('');
    setStartTime(null);
    setEndTime(null);
    setWpm(0);
    setAccuracy(100);
    setIsNewHighScore(false);
    setTimedEnded(false);
    setKeyHeatmap({});
    setIsCustomMode(true);
    setShowCustomInput(false);
    setTimeout(() => containerRef.current?.focus(), 0);
  }, []);

  const handleSaveCustomSnippet = useCallback(() => {
    if (!customCode.trim()) return;
    const name = customName.trim() || 'Custom Snippet';
    const updated = saveCustomSnippet(customCode.trim(), name);
    setSavedCustomSnippets(updated);
    startCustomSnippet(customCode.trim(), name);
    setCustomCode('');
    setCustomName('');
  }, [customCode, customName, startCustomSnippet]);

  const handleDeleteCustomSnippet = useCallback((index: number) => {
    const updated = deleteCustomSnippet(index);
    setSavedCustomSnippets(updated);
  }, []);

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

      // Update achievement stats and check for new achievements
      const updatedStats = updateAchievementStats(finalWpm, finalAcc, timedStats.totalChars, newStreak);
      setAchievementStats(updatedStats);
      const newlyUnlocked = checkNewAchievements(updatedStats, unlockedAchievements);
      if (newlyUnlocked.length > 0) {
        const allUnlocked = [...unlockedAchievements, ...newlyUnlocked.map(a => a.id)];
        setUnlockedAchievements(allUnlocked);
        saveUnlockedAchievements(allUnlocked);
        // Show first new achievement
        setNewAchievement(newlyUnlocked[0]);
        setTimeout(() => setNewAchievement(null), 4000);
      }
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

        // Handle Daily Challenge completion
        if (dailyMode) {
          const currentBest = dailyBest;
          const isNewBest = !currentBest || finalWpm > currentBest.wpm || 
                           (finalWpm === currentBest.wpm && finalAccuracy > currentBest.accuracy);
          if (isNewBest) {
            const newBest = saveDailyBest(finalWpm, finalAccuracy, snippet.id);
            setDailyBest(newBest);
          }
          setDailyResult({ wpm: finalWpm, accuracy: finalAccuracy, isNewBest });
          setShowDailyComplete(true);
        }

        // Add to WPM history
        const entry: WpmEntry = {
          wpm: finalWpm,
          accuracy: finalAccuracy,
          date: new Date().toISOString(),
          mode: dailyMode ? 'daily' : 'practice'
        };
        setWpmHistory(addWpmEntry(entry));

        // Update achievement stats and check for new achievements
        const updatedStats = updateAchievementStats(finalWpm, finalAccuracy, snippet.code.length, newStreak);
        setAchievementStats(updatedStats);
        const newlyUnlocked = checkNewAchievements(updatedStats, unlockedAchievements);
        if (newlyUnlocked.length > 0) {
          const allUnlocked = [...unlockedAchievements, ...newlyUnlocked.map(a => a.id)];
          setUnlockedAchievements(allUnlocked);
          saveUnlockedAchievements(allUnlocked);
          // Show first new achievement
          setNewAchievement(newlyUnlocked[0]);
          setTimeout(() => setNewAchievement(null), 4000);
        }
      }
    }
  }, [snippet, input, startTime, endTime, timedMode, timedEnded, language, highScore, soundEnabled, unlockedAchievements, dailyMode, dailyBest]);

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
        {/* Focus Mode Indicator */}
        {focusMode && (
          <div className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-full bg-purple-600/90 text-white text-xs font-medium flex items-center gap-2">
            <span>🎯 Focus Mode</span>
            <button 
              onClick={() => setFocusMode(false)}
              className="hover:bg-purple-500 rounded px-1.5 py-0.5 transition-colors"
            >
              Exit
            </button>
          </div>
        )}

        {/* Header - hidden in focus mode */}
        {!focusMode && (
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
        )}

        {/* Daily Challenge Info Banner */}
        {dailyMode && !showDailyComplete && (
          <div className="w-full max-w-2xl mb-6 fade-in">
            <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📅</span>
                  <div>
                    <h3 className="text-amber-400 font-bold text-sm">DAILY CHALLENGE</h3>
                    <p className="text-zinc-400 text-xs">{getDailyChallengeDate()}</p>
                  </div>
                </div>
                {dailyBest ? (
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Today's Best</p>
                    <p className="text-amber-400 font-bold">{dailyBest.wpm} WPM</p>
                    <p className="text-xs text-zinc-500">{dailyBest.accuracy}% accuracy</p>
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">No attempts yet!</p>
                    <p className="text-amber-400/60 text-xs">Be the first today</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Daily Challenge Complete Modal */}
        {showDailyComplete && dailyResult && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 fade-in">
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-8 max-w-md w-full mx-4 text-center">
              <div className="text-6xl mb-4">{dailyResult.isNewBest ? '🎉' : '✅'}</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {dailyResult.isNewBest ? 'New Personal Best!' : 'Challenge Complete!'}
              </h2>
              <p className="text-zinc-400 mb-6">{getDailyChallengeDate()}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-zinc-800 rounded-xl p-4">
                  <p className="text-3xl font-bold text-purple-400">{dailyResult.wpm}</p>
                  <p className="text-xs text-zinc-500">WPM</p>
                </div>
                <div className="bg-zinc-800 rounded-xl p-4">
                  <p className="text-3xl font-bold text-green-400">{dailyResult.accuracy}%</p>
                  <p className="text-xs text-zinc-500">Accuracy</p>
                </div>
              </div>
              
              {dailyBest && !dailyResult.isNewBest && (
                <p className="text-zinc-500 text-sm mb-4">
                  Today's best: {dailyBest.wpm} WPM ({dailyBest.accuracy}%)
                </p>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={startDailyChallenge}
                  className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-medium transition-all"
                >
                  Try Again
                </button>
                <button
                  onClick={() => { setShowDailyComplete(false); startNewGame(); }}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white font-medium transition-all"
                >
                  Practice Mode
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Achievement Unlock Toast */}
        {newAchievement && (
          <div className="fixed top-4 right-4 z-50 animate-bounce-in">
            <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{newAchievement.emoji}</span>
                <div>
                  <p className="text-yellow-400 font-bold text-sm">🏆 Achievement Unlocked!</p>
                  <p className="text-white font-semibold">{newAchievement.name}</p>
                  <p className="text-zinc-400 text-xs">{newAchievement.description}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Achievements Panel - hidden in focus mode */}
        {showAchievements && !focusMode && (
          <div className="w-full max-w-2xl mb-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 fade-in">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>🏆</span> Achievements
              <span className="text-sm text-zinc-500 font-normal">
                ({unlockedAchievements.length}/{achievements.length})
              </span>
            </h3>
            
            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-purple-400">{achievementStats.totalSessions}</div>
                <div className="text-xs text-zinc-500">Sessions</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-green-400">{achievementStats.bestWpm}</div>
                <div className="text-xs text-zinc-500">Best WPM</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-pink-400">{achievementStats.perfectSessions}</div>
                <div className="text-xs text-zinc-500">Perfect</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-orange-400">{Math.round(achievementStats.totalCharsTyped / 1000)}k</div>
                <div className="text-xs text-zinc-500">Chars</div>
              </div>
            </div>

            {/* Achievement Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto">
              {achievements.map((achievement) => {
                const isUnlocked = unlockedAchievements.includes(achievement.id);
                return (
                  <div
                    key={achievement.id}
                    className={`relative p-3 rounded-xl text-center transition-all ${
                      isUnlocked
                        ? 'bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30'
                        : 'bg-zinc-800/30 border border-zinc-700/50 opacity-50'
                    }`}
                    title={`${achievement.name}: ${achievement.description}`}
                  >
                    <span className={`text-2xl ${isUnlocked ? '' : 'grayscale'}`}>{achievement.emoji}</span>
                    <p className={`text-xs mt-1 truncate ${isUnlocked ? 'text-white' : 'text-zinc-500'}`}>
                      {achievement.name}
                    </p>
                    {isUnlocked && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                        <span className="text-[8px]">✓</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leaderboard - hidden in focus mode */}
        {showLeaderboard && !focusMode && (
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

        {/* WPM History Chart - hidden in focus mode */}
        {showHistory && !focusMode && (
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

        {/* Keyboard Heatmap - hidden in focus mode */}
        {showHeatmap && !focusMode && (
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
                onClick={() => { setTimedMode(null); setDailyMode(false); if (timerRef.current) clearInterval(timerRef.current); setTimeRemaining(null); setTimedEnded(false); startNewGame(); setTimeout(() => containerRef.current?.focus(), 0); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  !timedMode && !dailyMode 
                    ? 'bg-purple-600 text-white' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Practice
              </button>
              <button
                onClick={startDailyChallenge}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  dailyMode 
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                📅 Daily
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
                onClick={() => { setShowAchievements(!showAchievements); setShowLeaderboard(false); setShowHistory(false); setShowHeatmap(false); }}
                className={`p-2 rounded-lg text-sm transition-all relative ${
                  showAchievements ? 'bg-yellow-600 text-white' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
                }`}
                title={`Achievements (${unlockedAchievements.length}/${achievements.length})`}
              >
                🎖️
                {unlockedAchievements.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full text-[10px] font-bold text-black flex items-center justify-center">
                    {unlockedAchievements.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setShowLeaderboard(!showLeaderboard); if (!showLeaderboard) fetchLeaderboard(); setShowHistory(false); setShowHeatmap(false); setShowAchievements(false); }}
                className={`p-2 rounded-lg text-sm transition-all ${
                  showLeaderboard ? 'bg-purple-600 text-white' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
                }`}
                title="Leaderboard"
              >
                🏆
              </button>
              <button
                onClick={() => { setShowHistory(!showHistory); setShowLeaderboard(false); setShowHeatmap(false); setShowAchievements(false); }}
                className={`p-2 rounded-lg text-sm transition-all ${
                  showHistory ? 'bg-pink-600 text-white' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
                }`}
                title="My Progress"
              >
                📈
              </button>
              <button
                onClick={() => { setShowHeatmap(!showHeatmap); setShowLeaderboard(false); setShowHistory(false); setShowAchievements(false); }}
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
              <button
                onClick={() => setFocusMode(!focusMode)}
                className={`p-2 rounded-lg text-sm transition-all ${
                  focusMode ? 'bg-purple-600 text-white' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
                }`}
                title={focusMode ? 'Exit Focus Mode' : 'Focus Mode - Hide distractions'}
              >
                {focusMode ? '👁️' : '🎯'}
              </button>
              <button
                onClick={() => { setShowCustomInput(!showCustomInput); setShowLeaderboard(false); setShowHistory(false); setShowHeatmap(false); }}
                className={`p-2 rounded-lg text-sm transition-all ${
                  showCustomInput ? 'bg-cyan-600 text-white' : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
                }`}
                title="Custom Text Input"
              >
                ✏️
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

        {/* Custom Text Input Panel */}
        {showCustomInput && !focusMode && (
          <div className="w-full max-w-3xl mb-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 fade-in">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>✏️</span> Custom Text
              <span className="text-xs text-zinc-500 font-normal ml-2">Paste your own code to practice</span>
            </h3>
            
            {/* Input Area */}
            <div className="space-y-3 mb-4">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Snippet name (optional)"
                maxLength={40}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <textarea
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                placeholder={`Paste your code here...\n\nExample:\nconst hello = (name) => {\n  return \`Hello, \${name}!\`;\n};`}
                rows={6}
                className="w-full px-3 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-cyan-500 transition-colors resize-y"
                style={{ tabSize: 2 }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => startCustomSnippet(customCode, customName || undefined)}
                  disabled={!customCode.trim()}
                  className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
                >
                  ▶ Start Typing
                </button>
                <button
                  onClick={handleSaveCustomSnippet}
                  disabled={!customCode.trim()}
                  className="px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
                >
                  💾 Save & Start
                </button>
              </div>
              {customCode.trim() && (
                <p className="text-xs text-zinc-500">{customCode.trim().length} characters</p>
              )}
            </div>

            {/* Saved Custom Snippets */}
            {savedCustomSnippets.length > 0 && (
              <div className="pt-3 border-t border-zinc-700">
                <p className="text-xs text-zinc-500 mb-2">Saved snippets ({savedCustomSnippets.length})</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {savedCustomSnippets.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-all group">
                      <button
                        onClick={() => startCustomSnippet(s.code, s.name)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-sm text-white font-medium truncate">{s.name}</p>
                        <p className="text-xs text-zinc-500 truncate font-mono">{s.code.slice(0, 60)}...</p>
                      </button>
                      <span className="text-xs text-zinc-600">{s.code.length}ch</span>
                      <button
                        onClick={() => handleDeleteCustomSnippet(i)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all p-1"
                        title="Delete snippet"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Mode indicator */}
        {isCustomMode && !showCustomInput && (
          <div className="w-full max-w-3xl mb-3 flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-cyan-400 text-sm">
              <span>✏️</span>
              <span className="font-medium">Custom Mode</span>
            </div>
            <button
              onClick={() => { setIsCustomMode(false); startNewGame(); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded bg-zinc-800/50"
            >
              ← Back to Library
            </button>
          </div>
        )}

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
              {isCustomMode ? (
                <span className="w-3 h-3 rounded-full bg-cyan-400" />
              ) : (
                <span 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: languages.find(l => l.id === snippet.language)?.color }}
                />
              )}
              <span className="text-zinc-400 text-sm font-medium">{snippet.name}</span>
            </div>
            {isCustomMode ? (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                custom
              </span>
            ) : (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                snippet.difficulty === 'easy' ? 'badge-easy' :
                snippet.difficulty === 'medium' ? 'badge-medium' :
                'badge-hard'
              }`}>
                {snippet.difficulty}
              </span>
            )}
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

        {/* Footer - hidden in focus mode */}
        {!focusMode && (
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
        )}
      </div>
    </main>
  );
}
