export type ThemeLike = { count: number; liked: boolean }
export type LikeCounts = Record<string, number>

// The subset of Cloudflare D1 the like store uses, so tests can back it with any SQLite.
export interface LikeStatement {
  bind(...values: unknown[]): LikeStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
}

export interface LikeDatabase {
  prepare(query: string): LikeStatement
  batch<T = Record<string, unknown>>(statements: LikeStatement[]): Promise<{ results: T[] }[]>
}

type LikeRow = { count: number | null; liked: number | null }

const READ_LIKE = `SELECT
  (SELECT count FROM like_counts WHERE theme_id = ?1) AS count,
  EXISTS (SELECT 1 FROM likes WHERE theme_id = ?1 AND voter = ?2) AS liked`

function toThemeLike(row: LikeRow | null | undefined): ThemeLike {
  return { count: row?.count ?? 0, liked: Boolean(row?.liked) }
}

export async function readLikeCounts(db: LikeDatabase): Promise<LikeCounts> {
  const { results } = await db
    .prepare('SELECT theme_id, count FROM like_counts WHERE count > 0')
    .all<{ theme_id: string; count: number }>()
  return Object.fromEntries(results.map(({ theme_id, count }) => [theme_id, count]))
}

export async function readThemeLike(db: LikeDatabase, themeId: string, voter: string | null): Promise<ThemeLike> {
  return toThemeLike(await db.prepare(READ_LIKE).bind(themeId, voter ?? '').first<LikeRow>())
}

// Sets the visitor's like to an explicit state, so retries and double clicks stay idempotent.
export async function writeThemeLike(
  db: LikeDatabase,
  themeId: string,
  voter: string,
  liked: boolean,
  now = Date.now(),
): Promise<ThemeLike> {
  const write = liked
    ? db.prepare('INSERT OR IGNORE INTO likes (theme_id, voter, created_at) VALUES (?1, ?2, ?3)').bind(themeId, voter, now)
    : db.prepare('DELETE FROM likes WHERE theme_id = ?1 AND voter = ?2').bind(themeId, voter)
  const [, read] = await db.batch<LikeRow>([write, db.prepare(READ_LIKE).bind(themeId, voter)])
  return toThemeLike(read?.results[0])
}

export function sortByLikes<T extends { id: string }>(items: readonly T[], counts: LikeCounts): T[] {
  return items
    .map((item, index) => ({ item, index, count: counts[item.id] ?? 0 }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .map(({ item }) => item)
}
