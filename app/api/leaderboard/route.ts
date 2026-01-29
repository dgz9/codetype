import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, addScore, initDB } from '@/lib/db';

// Initialize DB on first request
let dbInitialized = false;

async function ensureDB() {
  if (!dbInitialized) {
    try {
      await initDB();
      dbInitialized = true;
    } catch (e) {
      console.error('DB init error:', e);
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureDB();
    
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const leaderboard = await getLeaderboard(mode, limit);
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDB();
    
    const body = await request.json();
    const { name, wpm, accuracy, mode, language } = body;
    
    // Validation
    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 20) {
      return NextResponse.json({ error: 'Name must be 1-20 characters' }, { status: 400 });
    }
    if (typeof wpm !== 'number' || wpm < 1 || wpm > 500) {
      return NextResponse.json({ error: 'Invalid WPM' }, { status: 400 });
    }
    if (typeof accuracy !== 'number' || accuracy < 0 || accuracy > 100) {
      return NextResponse.json({ error: 'Invalid accuracy' }, { status: 400 });
    }
    // Must have at least 80% accuracy to submit
    if (accuracy < 80) {
      return NextResponse.json({ error: 'Need at least 80% accuracy to submit' }, { status: 400 });
    }
    
    const entry = await addScore(name.trim(), Math.round(wpm), Math.round(accuracy), mode || 'practice', language);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Leaderboard POST error:', error);
    return NextResponse.json({ error: 'Failed to add score' }, { status: 500 });
  }
}
