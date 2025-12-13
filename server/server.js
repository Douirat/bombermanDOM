import { WebSocketServer } from "ws";
import { deployMap } from "./ws.js";

const ws = new WebSocketServer({ port: 3000 });
console.log("WS server running at localhost:3000");

// Track multiple game instances
const gameInstances = [];
let currentInstance = null;

export function setupGame() {
  return {
    timer: null,
    countdown: 0,
    clients: new Map(),
    players: new Map(), // Maps WebSocket to player data (nickname, x, y, etc.)
    status: "waiting", // waiting, phase1, phase2, started
    map: null, // To store the game map
    bombs: new Map(), // To store active bombs
    powerups: new Map(), // To store active powerups
    hiddenPowerups: new Map(), // To store powerups under breakable walls
    lives: new Map(),
    eliminatedPlayers: new Set(),
  };
}

const PLAYER_START_POS = [
  { x: 1, y: 1 },
  { x: 1, y: 11 },
  { x: 11, y: 1 },
  { x: 11, y: 11 },
];

const POWERUPS = { SPEED: "speed", BOMBPOWER: "bombPower", FLAMES: "flames" };

export function generatePowerups(instance) {
  const BREAKABLE_WALL = 2;
  const powerupSlots = [];

  for (let y = 0; y < instance.map.length; y++) {
    for (let x = 0; x < instance.map[y].length; x++) {
      if (instance.map[y][x] === BREAKABLE_WALL) {
        powerupSlots.push({ x, y });
      }
    }
  }
  // Ensures powerups are distributed across the map
  shuffleArray(powerupSlots);

  const POWERUP_TYPES = Object.values(POWERUPS);
  const powerupsPerType = 3;

  for (let i = 0; i < powerupSlots.length && i < POWERUP_TYPES.length * powerupsPerType; i++) {
    const type = POWERUP_TYPES[i % POWERUP_TYPES.length];
    const slot = powerupSlots[i];
    instance.hiddenPowerups.set(`${slot.x},${slot.y}`, type);
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function broadcast(instance, message) {
  const data = JSON.stringify(message);
  instance.clients.forEach((_, client) => {
    if (client.readyState === 1) client.send(data);
  });
}

export function countdown(instance, seconds, phase) {
  if (instance.timer) clearInterval(instance.timer);

  instance.status = phase === 1 ? "phase1" : "phase2";
  instance.countdown = seconds;

  broadcast(instance, { type: "timer", phase: phase, value: seconds });

  instance.timer = setInterval(() => {
    instance.countdown--;

    if (instance.countdown >= 1) {
      broadcast(instance, {
        type: "timer",
        value: instance.countdown,
        phase: instance.status === "phase1" ? 1 : 2,
      });
    }

    if (instance.countdown <= 0) {
      if (instance.status === "phase1") {
        instance.status = "phase2";
        instance.countdown = 10;
        broadcast(instance, { type: "timer", phase: 2, value: 10 });
      } else if (instance.status === "phase2") {
        // To render the map
        clearInterval(instance.timer);
        instance.status = "started";

        const map = deployMap(); // Generate map on the server
        instance.map = map; // Store it in the game instance
        generatePowerups(instance); // Generate powerups on the server

        // Send both the game start and the map to clients
        broadcast(instance, {
          type: "gameStart",
          map: map, // And initial player data
          playersData: Array.from(instance.players.values()),
        });
      }
    }

    if (instance.status === "phase1" && instance.clients.size === 4) {
      clearInterval(instance.timer);
      countdown(instance, 10, 2);
    }
  }, 1000);
}

export function addPlayer(instance, ws, nickname) {
  if (instance.clients.size >= 4) return false;

  instance.clients.set(ws, nickname);

  const playerIndex = instance.clients.size - 1; // 0, 1, 2, 3
  const startPos = PLAYER_START_POS[playerIndex];

  instance.players.set(ws, {
    nickname: nickname,
    x: startPos.x,
    y: startPos.y,
    id: playerIndex, // Assign a unique ID for client-side rendering
    speed: 1,
    maxBombs: 1,
    bombActive: 0,
    delai: 100,
    lives: 3,
    isAlive: true,
    bombRange: 1,
  });
  ws.gameInstance = instance; // Link the WebSocket to its game instance

  // Broadcast updated player list
  broadcast(instance, {
    type: "playersList",
    players: Array.from(instance.clients.values()),
  });

  // Start timer logic
  if (instance.clients.size === 2 && instance.status === "waiting") {
    countdown(instance, 20, 1);
  } else if (instance.clients.size === 4 && instance.status === "phase1") {
    clearInterval(instance.timer);
    countdown(instance, 10, 2);
  }

  return true;
}

export function removePlayerFromInstance(instance, ws) {
  instance.clients.delete(ws);
  instance.players.delete(ws); // Also remove play data

  if (instance.clients.size < 2 && instance.status !== "waiting") {
    clearInterval(instance.timer);
    instance.status = "waiting";
    broadcast(instance, { type: "gameInterrupt" });
  } else if (instance.clients.size === 3 && instance.status === "phase2") {
    clearInterval(instance.timer);
    countdown(instance, 20, 1);
  }

  if (instance.clients.size > 0) {
    broadcast(instance, {
      type: "playersList",
      players: Array.from(instance.clients.values()),
    });
    // Also broadcast updated player positions after someone leaves
    broadcast(instance, {
      type: "playersUpdate",
      playersData: Array.from(instance.players.values()),
    });
  }
}


// Global tile constants for consistency
const EMPTY = 0;
const WALL = 1;
const BREAKABLE_WALL = 2;

// function to handle player movement
export function movePlayer(ws, direction) {
  const instance = ws.gameInstance;
  if (!instance || instance.status !== "started") return;

  const player = instance.players.get(ws);
  if (!player) return;

  const now = Date.now();
  if (player.lastMoveTime && now - player.lastMoveTime < player.delai) return;

  let newX = player.x;
  let newY = player.y;

  switch (direction) {
    case "up":
      newY--;
      break;
    case "down":
      newY++;
      break;
    case "left":
      newX--;
      break;
    case "right":
      newX++;
      break;
  }

  // Collision detection with map limits and walls
  const MAP_SIZE = 13;
  if (newX >= 0 && newX < MAP_SIZE && newY >= 0 && newY < MAP_SIZE) {
    const targetTile = instance.map[newY][newX];
    const bombExist = Array.from(instance.bombs.values()).some(
      (bomb) => bomb.x === newX && bomb.y === newY
    );

    // Player can move into EMPTY tiles.
    if (targetTile === EMPTY && !bombExist) {
      player.x = newX;
      player.y = newY;
      player.lastMoveTime = now;

      checkPowerupCollection(instance, player);

      // Broadcast updated player positions
      broadcast(instance, {
        type: "playersUpdate",
        playersData: Array.from(instance.players.values()),
      });
    }
  }
}


function checkPowerupCollection(instance, player) {
  for (const [powerupId, powerup] of instance.powerups) {
    if (powerup.x === player.x && powerup.y === player.y) {
      applyPowerup(player, powerup.type);
      instance.powerups.delete(powerupId);

      broadcast(instance, {
        type: "powerupCollection",
        powerupId: powerupId,
        playerNickname: player.nickname,
        powerupType: powerup.type,
      });

      break;
    }
  }
}

function applyPowerup(player, powerupType) {
  switch (powerupType) {
    case POWERUPS.SPEED:
      // Reduce delay by 20% each time (e.g., 100ms → 80ms → 64ms)
      player.delai = Math.max(50, player.delai * 0.8); // Cap at 50ms minimum
      break;
    case POWERUPS.BOMBPOWER:
      player.maxBombs = Math.min(player.maxBombs + 1, 3);
      break;
    case POWERUPS.FLAMES:
      player.bombRange = player.bombRange + 1;
      break;
  }
}

// Handle bomb placement
export function handleBombPlacement(ws) {
  const instance = ws.gameInstance;
  if (!instance || instance.status !== "started") return;

  const player = instance.players.get(ws);
  if (!player) return;

  if (player.bombActive >= player.maxBombs) return;

  for (const bomb of instance.bombs.values()) {
    if (bomb.x === player.x && bomb.y === player.y) return;
  }

  // Prevent placing a bomb on a non-empty tile
  const currentTile = instance.map[player.y][player.x];
  if (currentTile !== EMPTY) return;

  const bombId = `bomb-${player.x}-${player.y}-${Date.now()}`;
  const bomb = {
    id: bombId,
    x: player.x,
    y: player.y,
    owner: player.nickname,
    timer: 3000,
    range: player.bombRange,
  };

  instance.bombs.set(bombId, bomb);
  player.bombActive++;

  broadcast(instance, {
    type: "bombPlaced",
    bomb: { id: bomb.id, x: bomb.x, y: bomb.y },
  });

  // Set a timeout for the bomb to explode
  setTimeout(() => {
    if (instance.bombs.has(bombId)) {
      instance.bombs.delete(bombId);
      player.bombActive--;
      handleBombExplosion(instance, bomb);
    }
  }, bomb.timer);
}

export function handleBombExplosion(instance, bomb) {
  const MAP_SIZE = 13;
  const affectedTiles = [];
  const hitPlayers = new Set();

  // Center of the explosion
  affectedTiles.push({ x: bomb.x, y: bomb.y });

  // Explosion in four directions
  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  for (const dir of directions) {
    for (let i = 1; i <= bomb.range; i++) {
      const targetX = bomb.x + dir.dx * i;
      const targetY = bomb.y + dir.dy * i;

      if (targetX >= 0 && targetX < MAP_SIZE && targetY >= 0 && targetY < MAP_SIZE) {
        const tile = instance.map[targetY][targetX];
        if (tile === BREAKABLE_WALL) {
          instance.map[targetY][targetX] = EMPTY;
          affectedTiles.push({ x: targetX, y: targetY });

          // Check if a powerup was hidden here
          const hiddenPowerupType = instance.hiddenPowerups.get(`${targetX},${targetY}`);
          if (hiddenPowerupType) {
            const powerupId = `powerup-${targetX}-${targetY}-${Date.now()}`;
            const powerup = {
              id: powerupId,
              x: targetX,
              y: targetY,
              type: hiddenPowerupType,
            };
            instance.powerups.set(powerupId, powerup);
            instance.hiddenPowerups.delete(`${targetX},${targetY}`); // Not hidden
            // Broadcast that a new powerup has appeared
            broadcast(instance, { type: "powerupAppeared", powerup: powerup });
          }
          break;
        } else if (tile === EMPTY) {
          // Explosion can pass through empty tiles
          affectedTiles.push({ x: targetX, y: targetY });
        } else {
          //
          break; // Stop the explosion in this direction in a solid wall (WALL = 1)
        }
      } else {
        // Out of bounds
        break;
      }
    }
  }

  // Check all affected tiles for players
  affectedTiles.forEach((tile) => {
    for (const [ws, player] of instance.players) {
      if (player.isAlive && player.x === tile.x && player.y === tile.y) {
        hitPlayers.add(ws);
      }
    }
  });

  const GAME_OVER_DELAY = 500;

  hitPlayers.forEach((ws) => {
    const player = instance.players.get(ws);
    player.lives--;

    if (player.lives <= 0) {
      player.isAlive = false;
      ws.removeAllListeners("message");

      instance.eliminatedPlayers.add(player.nickname);

      // Only allow chat messages from eliminated players
      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message);
          if (data.type === "chatMessage") {
            broadcast(instance, {
              type: "chatMessage",
              sender: player.nickname,
              content: data.content,
            });
          }
        } catch (err) {
          console.error("Invalid message from eliminated player:", err);
        }
      });

      // Broadcast elimination
      broadcast(instance, {
        type: "playerEliminated",
        nickname: player.nickname,
        id: player.id,
      });
    }

    // Broadcast player hit
    broadcast(instance, {
      type: "playerHit",
      nickname: player.nickname,
      lives: player.lives,
      isAlive: player.isAlive,
    });
  });

  setTimeout(() => {
    if (!instance.gameOver) {
      const alivePlayers = Array.from(instance.players.values()).filter((p) => p.isAlive);
      if (alivePlayers.length <= 1) {
        instance.gameOver = true;
        const winner = alivePlayers.length === 1 ? alivePlayers[0].nickname : null;
        broadcast(instance, {
          type: "gameOver",
          winner: winner,
          timestamp: Date.now(),
          eliminatedPlayers: Array.from(instance.eliminatedPlayers),
        });
      }
    }
  }, GAME_OVER_DELAY);

  // Broadcast the explosion and updated map to all clients in the instance
  broadcast(instance, {
    type: "bombExploded",
    bombId: bomb.id,
    x: bomb.x,
    y: bomb.y,
    affectedTiles: affectedTiles, // Send tiles affected by explosion
    updatedMap: instance.map, // Send the updated map
    hitPlayers: Array.from(hitPlayers).map((ws) => instance.players.get(ws).id),
  });
}