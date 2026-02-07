import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let sql: NeonQueryFunction<false, false> | null = null;

function getSQL() {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not set');
    }
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

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
  const db = getSQL();
  await db`
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
  await db`
    CREATE INDEX IF NOT EXISTS idx_leaderboard_wpm ON leaderboard(wpm DESC)
  `;
}

export async function getLeaderboard(mode?: string, limit: number = 10): Promise<LeaderboardEntry[]> {
  const db = getSQL();
  if (mode) {
    const result = await db`
      SELECT id, name, wpm, accuracy, mode, language, created_at
      FROM leaderboard 
      WHERE mode = ${mode}
      ORDER BY wpm DESC 
      LIMIT ${limit}
    `;
    return result as LeaderboardEntry[];
  }
  
  const result = await db`
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
  const db = getSQL();
  const result = await db`
    INSERT INTO leaderboard (name, wpm, accuracy, mode, language)
    VALUES (${name}, ${wpm}, ${accuracy}, ${mode}, ${language || null})
    RETURNING id, name, wpm, accuracy, mode, language, created_at
  `;
  return result[0] as LeaderboardEntry;
}

export { getSQL };
