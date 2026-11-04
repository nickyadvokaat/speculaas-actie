import type { LeaderboardEntry } from '../types'

export interface RankedLeaderboardEntry extends LeaderboardEntry {
  rank: number
  shared: boolean
}

export function rankLeaderboardEntries(entries: LeaderboardEntry[]): RankedLeaderboardEntry[] {
  let previousTotal: number | null = null
  let previousRank = 0
  const ranked = entries.map((entry, index) => {
    const total = Number(entry.total_cents)
    const rank = total === previousTotal ? previousRank : index + 1
    previousTotal = total
    previousRank = rank
    return { ...entry, rank }
  })
  const rankCounts = new Map<number, number>()
  for (const entry of ranked) rankCounts.set(entry.rank, (rankCounts.get(entry.rank) ?? 0) + 1)
  return ranked.map((entry) => ({ ...entry, shared: (rankCounts.get(entry.rank) ?? 0) > 1 }))
}
