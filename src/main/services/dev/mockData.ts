// Dev-only fixtures that mimic Riot's LCU champ-select session and the
// Live Client API payload, so Draft and In-Game can be exercised without a
// real game.

/** Builds an LCU champ-select session in the picking phase, local player on the clock. */
export function mockChampSelectSession(championIds: number[]) {
  // championIds: a handful of real, seeded champion IDs.
  const [allyA, allyB, enemyA, enemyB, banA, banB, localPick] = championIds;

  return {
    localPlayerCellId: 0,
    timer: { phase: 'BAN_PICK', adjustedTimeLeftInPhase: 27000 },
    myTeam: [
      { cellId: 0, championId: localPick ?? 0 }, // local player (drives rune suggestion)
      { cellId: 1, championId: allyA },
      { cellId: 2, championId: allyB },
      { cellId: 3, championId: 0 },
      { cellId: 4, championId: 0 },
    ],
    theirTeam: [
      { cellId: 5, championId: enemyA },
      { cellId: 6, championId: enemyB },
    ],
    actions: [
      [
        { type: 'ban', completed: true, isInProgress: false, actorCellId: 0, championId: banA },
        { type: 'ban', completed: true, isInProgress: false, actorCellId: 5, championId: banB },
      ],
      [
        { type: 'pick', completed: false, isInProgress: true, actorCellId: 0, championId: 0 },
      ],
    ],
  };
}

/** Builds an LCU champ-select session in the banning phase, local player on the clock. */
export function mockBanPhaseSession(championIds: number[]) {
  const [enemyA, enemyB] = championIds;
  return {
    localPlayerCellId: 0,
    timer: { phase: 'PLANNING' },
    myTeam: [{ cellId: 0, championId: 0 }],
    theirTeam: [
      { cellId: 5, championId: enemyA },
      { cellId: 6, championId: enemyB },
    ],
    actions: [
      [{ type: 'ban', completed: false, isInProgress: true, actorCellId: 0, championId: 0 }],
    ],
  };
}

/** Builds a realistic Live Client `allgamedata` payload at ~18 minutes. */
export function mockLiveGameData() {
  const scores = (k: number, d: number, a: number, cs: number, ward = 15) => ({
    kills: k, deaths: d, assists: a, creepScore: cs, wardScore: ward,
  });
  const items = (ids: number[]) => ids.map(itemID => ({ itemID }));

  return {
    activePlayer: {
      summonerName: 'DarkTex01',
      currentGold: 1340,
    },
    allPlayers: [
      // Allies (ORDER) — includes local player
      { summonerName: 'DarkTex01', championName: 'Lux', team: 'ORDER', position: 'MIDDLE',
        level: 12, scores: scores(4, 3, 6, 142), items: items([6655, 3020, 3165]), isDead: false, respawnTimer: 0 },
      { summonerName: 'AllyTop', championName: 'Garen', team: 'ORDER', position: 'TOP',
        level: 13, scores: scores(2, 2, 4, 165), items: items([3071, 3047]), isDead: false, respawnTimer: 0 },
      { summonerName: 'AllyJgl', championName: 'LeeSin', team: 'ORDER', position: 'JUNGLE',
        level: 11, scores: scores(3, 4, 8, 98), items: items([6630, 3047]), isDead: false, respawnTimer: 0 },
      { summonerName: 'AllyAdc', championName: 'Jinx', team: 'ORDER', position: 'BOTTOM',
        level: 12, scores: scores(5, 2, 3, 178), items: items([6672, 3031]), isDead: false, respawnTimer: 0 },
      { summonerName: 'AllySup', championName: 'Thresh', team: 'ORDER', position: 'UTILITY',
        level: 9, scores: scores(0, 3, 12, 32, 45), items: items([3850, 3047]), isDead: false, respawnTimer: 0 },
      // Enemies (CHAOS) — one fed
      { summonerName: 'EnemyMid', championName: 'Zed', team: 'CHAOS', position: 'MIDDLE',
        level: 14, scores: scores(9, 1, 4, 190), items: items([6691, 3047, 6694, 3814]), isDead: false, respawnTimer: 0 },
      { summonerName: 'EnemyTop', championName: 'Darius', team: 'CHAOS', position: 'TOP',
        level: 12, scores: scores(4, 3, 2, 150), items: items([6630, 3047]), isDead: false, respawnTimer: 0 },
      { summonerName: 'EnemyJgl', championName: 'Kha\'Zix', team: 'CHAOS', position: 'JUNGLE',
        level: 11, scores: scores(3, 4, 5, 88), items: items([6692, 3047]), isDead: true, respawnTimer: 12 },
      { summonerName: 'EnemyAdc', championName: 'Caitlyn', team: 'CHAOS', position: 'BOTTOM',
        level: 12, scores: scores(3, 3, 4, 172), items: items([6672, 3006]), isDead: false, respawnTimer: 0 },
      { summonerName: 'EnemySup', championName: 'Lulu', team: 'CHAOS', position: 'UTILITY',
        level: 9, scores: scores(1, 4, 9, 28, 38), items: items([6617]), isDead: false, respawnTimer: 0 },
    ],
    events: {
      Events: [
        { EventID: 0, EventName: 'GameStart', EventTime: 0 },
        { EventID: 1, EventName: 'FirstBlood', EventTime: 95, Recipient: 'EnemyMid' },
        { EventID: 2, EventName: 'DragonKill', EventTime: 360, KillerName: 'AllyJgl', DragonType: 'Fire' },
        { EventID: 3, EventName: 'DragonKill', EventTime: 720, KillerName: 'EnemyJgl', DragonType: 'Earth' },
        { EventID: 4, EventName: 'TurretKilled', EventTime: 840, KillerName: 'EnemyMid' },
      ],
    },
    gameData: {
      gameTime: 1080, // 18:00 — past baron spawn, near third dragon
      gameMode: 'CLASSIC',
    },
  };
}
