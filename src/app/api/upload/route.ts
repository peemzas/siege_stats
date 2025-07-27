import { NextRequest, NextResponse } from 'next/server'

interface KillEvent {
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
  totalPoints: number
  totalKills: number
  totalDeaths: number
  totalKillsEachGuild: { guildName: string; count: number }[]
  totalDeathsEachGuild: { guildName: string; count: number }[]
  lives: Life[]
  kills: KillStat[]
  killedBy: KillStat[]
}

interface KillStat {
  name: string
  count: number
}

interface GuildStat {
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

function parseAndProcessLog(log: string): Result {
  const playerStats: { [key: string]: Omit<PlayerStat, 'lives'> & { events: ({ type: 'kill'; data: KillEvent } | { type: 'death'; data: KillEvent })[] } } = {}
  const guildStats: { [key: string]: GuildStat } = {}
  const guildPlayers: { [key: string]: Set<string> } = {}

  const getPlayer = (name: string) => {
    if (!playerStats[name]) {
      playerStats[name] = {
        name,
        rank: 0,
        guildName: '',
        totalPoints: 0,
        totalKills: 0,
        totalDeaths: 0,
        totalKillsEachGuild: [],
        totalDeathsEachGuild: [],
        events: [],
        kills: [],
        killedBy: [],
      }
    }
    return playerStats[name]
  }

  const getGuild = (name: string): GuildStat => {
    if (!guildStats[name]) {
      guildStats[name] = {
        name,
        rank: 0,
        playerCount: 0,
        totalPointsFromKills: 0,
        totalExtraLifePoints: 0,
        totalPoints: 0,
        totalKills: 0,
        totalDeaths: 0,
        kills: [],
        killedBy: [],
      }
      guildPlayers[name] = new Set()
    }
    return guildStats[name]
  }

  const addOrIncrementStat = (arr: KillStat[], name: string) => {
    const existing = arr.find(s => s.name === name)
    if (existing) {
      existing.count++
    } else {
      arr.push({ name, count: 1 })
    }
  }

  const entries = log.trim().split(/\n\s*\n/)
  const allPlayerNames = new Set<string>()

  // First pass: Extract all unique player names and initialize their stats
  for (const entry of entries) {
    const lines = entry.split('\n')
    if (lines.length < 2) continue

    const killStatLine = lines[0].trim()
    const attackMatch = killStatLine.match(/\[([^\]]+)\]\s+\[([^\]]+)\]\s+([^(\s]+)\s*\(/)
    const defenseMatch = killStatLine.match(/→ Attack \[([^\]]+)\](?: Guild Master| Defender)? (.+)$/)
    if (attackMatch) {
      allPlayerNames.add(attackMatch[3].trim()) // Attacker name
    }
    if (defenseMatch) {
      allPlayerNames.add(defenseMatch[2].trim()) // Defender name
    }
  }

  // Initialize playerStats for all unique players
  allPlayerNames.forEach(name => getPlayer(name))

  // Second pass: Process events and populate stats
  for (const entry of entries) {
    const lines = entry.split('\n')
    if (lines.length < 2) continue

    const killStatLine = lines[0].trim()
    const pointLine = lines[1].trim()

    const attackMatch = killStatLine.match(/\[([^\]]+)\]\s+\[([^\]]+)\]\s+(?:Guild Master\s*)?([^\(]+)\s*\(/)
    const defenseMatch = killStatLine.match(/→ Attack \[([^\]]+)\](?: Guild Master| Defender)? (.+)$/)

    if (attackMatch && defenseMatch) {
      const timestamp = attackMatch[1].trim()
      const attackerGuildName = attackMatch[2].trim()
      const attackerName = attackMatch[3].trim()
      const defenderGuildName = defenseMatch[1].trim()
      const defenderName = defenseMatch[2].trim()

      const totalPointsEachKill = [...pointLine.matchAll(/\+(\d+)/g)].reduce((sum, match) => sum + parseInt(match[1], 10), 0)

      const attackerGuild = getGuild(attackerGuildName)
      guildPlayers[attackerGuildName].add(attackerName)

      const defenderGuild = getGuild(defenderGuildName)
      guildPlayers[defenderGuildName].add(defenderName)

      const attackerPlayer = getPlayer(attackerName)
      attackerPlayer.guildName = attackerGuildName
      attackerPlayer.totalPoints += totalPointsEachKill
      attackerPlayer.totalKills += 1
      attackerPlayer.events.push({ type: 'kill', data: { playerName: defenderName, guildName: defenderGuildName, timestamp } })

      attackerGuild.totalPointsFromKills += totalPointsEachKill
      attackerGuild.totalKills += 1
      addOrIncrementStat(attackerGuild.kills, defenderGuildName)


      const defenderPlayer = getPlayer(defenderName)
      defenderPlayer.totalDeaths += 1
      defenderPlayer.guildName = defenderGuildName
      defenderPlayer.events.push({ type: 'death', data: { playerName: attackerName, guildName: attackerGuildName, timestamp } })

      defenderGuild.totalDeaths += 1
      addOrIncrementStat(defenderGuild.killedBy, attackerGuildName)
    }
  }

  const allPlayers = new Set<string>()
  Object.values(guildPlayers).forEach(playerSet => {
    playerSet.forEach(player => allPlayers.add(player))
  })

  const playerResults: PlayerStat[] = Object.values(playerStats).map(p => {
    p.events.sort((a, b) => new Date(a.data.timestamp).getTime() - new Date(b.data.timestamp).getTime());
    
    const lives: Life[] = [];
    let currentLife: Life = { kills: [] };

    for (const event of p.events) {
      if (event.type === 'kill') {
        currentLife.kills.push(event.data);
      } else if (event.type === 'death') {
        currentLife.death = event.data;
        lives.push(currentLife);
        currentLife = { kills: [] };
      }
    }
    if (currentLife.kills.length > 0) {
      lives.push(currentLife);
    }

    const kills: KillStat[] = p.events.filter(e => e.type === 'kill').reduce((acc: KillStat[], e) => {
      const existing = acc.find(k => k.name === e.data.playerName);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ name: e.data.playerName, count: 1 });
      }
      return acc;
    }, [])
    .sort((a, b) => b.count - a.count);

    const killedBy: KillStat[] = p.events.filter(e => e.type === 'death').reduce((acc: KillStat[], e) => {
      const existing = acc.find(k => k.name === e.data.playerName);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ name: e.data.playerName, count: 1 });
      }
      return acc;
    }, [])
    .sort((a, b) => b.count - a.count);

    // Calculate totalKillsEachGuild - count kills per guild
    const totalKillsEachGuild = p.events
      .filter(e => e.type === 'kill')
      .reduce((acc: { guildName: string; count: number }[], e) => {
        const guildName = e.data.guildName;
        const existing = acc.find(g => g.guildName === guildName);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ guildName, count: 1 });
        }
        return acc;
      }, [])
      .sort((a, b) => b.count - a.count);

      // Calculate totalDeathsEachGuild - count deaths per guild
    const totalDeathsEachGuild = p.events
      .filter(e => e.type === 'death')
      .reduce((acc: { guildName: string; count: number }[], e) => {
        const guildName = e.data.guildName;
        const existing = acc.find(g => g.guildName === guildName);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ guildName, count: 1 });
        }
        return acc;
      }, [])
      .sort((a, b) => b.count - a.count);

    return { ...p, lives, kills, killedBy, totalKillsEachGuild, totalDeathsEachGuild };
  })
  .sort((a, b) => b.totalPoints - a.totalPoints)
  .map((player, index) => ({ ...player, rank: index + 1 }));

  const guildResults = Object.values(guildStats).map(guild => {
    const maxLifePoints = guildPlayers[guild.name].size * 10
    const totalExtraLifePoints = maxLifePoints - guild.totalDeaths
    return {
      ...guild,
      playerCount: guildPlayers[guild.name].size,
      totalExtraLifePoints,
      totalPoints: guild.totalPointsFromKills + totalExtraLifePoints,
    }
  })
  .sort((a, b) => b.totalPoints - a.totalPoints)
  .map((guild, index) => ({ ...guild, rank: index + 1 }))

  return { playerResults, guildResults }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  const text = await file.text()
  const parsedData = parseAndProcessLog(text)
  return NextResponse.json(parsedData)
}
