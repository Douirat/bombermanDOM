import { WebSocketServer } from "ws";

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
