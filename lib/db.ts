import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export interface LeaderboardEntry {
  id: number;
  name: string;
  wpm: number;
  accuracy: number;
  mode: string;
  language: string | null;
  created_at: string;
}

export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      wpm INTEGER NOT NULL,
      accuracy INTEGER NOT NULL,
      mode VARCHAR(20) NOT NULL DEFAULT 'practice',
      language VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  // Create index for faster queries
  await sql`
    CREATE INDEX IF NOT EXISTS idx_leaderboard_wpm ON leaderboard(wpm DESC)
  `;
}

export async function getLeaderboard(mode?: string, limit: number = 10): Promise<LeaderboardEntry[]> {
  if (mode) {
    const result = await sql`
      SELECT id, name, wpm, accuracy, mode, language, created_at
      FROM leaderboard 
      WHERE mode = ${mode}
      ORDER BY wpm DESC 
      LIMIT ${limit}
    `;
    return result as LeaderboardEntry[];
  }
  
  const result = await sql`
    SELECT id, name, wpm, accuracy, mode, language, created_at
    FROM leaderboard 
    ORDER BY wpm DESC 
    LIMIT ${limit}
  `;
  return result as LeaderboardEntry[];
}

export async function addScore(
  name: string, 
  wpm: number, 
  accuracy: number, 
  mode: string = 'practice',
  language?: string
): Promise<LeaderboardEntry> {
  const result = await sql`
    INSERT INTO leaderboard (name, wpm, accuracy, mode, language)
    VALUES (${name}, ${wpm}, ${accuracy}, ${mode}, ${language || null})
    RETURNING id, name, wpm, accuracy, mode, language, created_at
  `;
  return result[0] as LeaderboardEntry;
}

export { sql };
