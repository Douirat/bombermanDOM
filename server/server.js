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

