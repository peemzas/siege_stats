export interface KillEvent {
  playerName: string
  guildName: string
  timestamp: string
}

export interface Life {
  kills: KillEvent[]
  death?: KillEvent
}

export interface PlayerStat {
  name: string
  rank: number
  guildName: string
  class?: string
  totalPoints: number
  totalKills: number
  totalDeaths: number
  totalKillsEachGuild: { guildName: string; count: number }[]
  totalDeathsEachGuild: { guildName: string; count: number }[]
  lives: Life[]
  kills: KillStat[]
  killedBy: KillStat[]
}

export interface KillStat {
  name: string
  count: number
}

export interface GuildStat {
  name: string
  rank: number
  playerCount: number
  totalPointsFromKills: number
  totalExtraLifePoints: number
  totalPoints: number
  totalKills: number
  totalDeaths: number
  kills: KillStat[]
  killedBy: KillStat[]
}

export interface Result {
  playerResults: PlayerStat[]
  guildResults: GuildStat[]
}
