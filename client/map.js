import { el as h, createDOMElement } from "../framework/minidom.js";

export const TILE_SIZE = 40;
const MAP_SIZE = 13; // 13x13
const BREAKABLE_WALL = 2;
const WALL = 1;
const EMPTY = 0;

const COLORS = {
  [WALL]: "#555555",
  [BREAKABLE_WALL]: "#bb6633",
  [EMPTY]: "#00ff80ff",
};

const STOPED_FRAME = 1; // the middle frame if the player is not moving

const bombSprite = new Image();
bombSprite.src = "./assets/bomb01.png";

const flamesPowerupImg = new Image();
flamesPowerupImg.src = "./assets/flame.png";

const explosionSprite = new Image();
explosionSprite.src = "./assets/explosion.gif";

// Array of player spritesheets
const playerSprites = [
  "./assets/player1.png",
  "./assets/player2.png",
  "./assets/player3.png",
  "./assets/player4.png",
];

const playerImg = new Image();
playerImg.src = "./assets/player1.png";

// Render the map frame
export function renderMap(map) {
  // Clear previous game container if it exists
  const existingGameContainer = document.getElementById("game-container");
  if (existingGameContainer) existingGameContainer.remove();
  const gameArea = document.querySelector("#game-area");
  const mapTree = h("div", {
    id: "game-container",
    style: {
      position: "relative", // Enables absolute positioning of children
      gridTemplateColumns: `repeat(${MAP_SIZE}, ${TILE_SIZE}px)`,
      gridTemplateRows: `repeat(${MAP_SIZE}, ${TILE_SIZE}px)`,
      display: "grid",
      gap: "0px",
      border: "2px solid #333",
      margin: "20px auto", // Center the map
      height: `${MAP_SIZE * TILE_SIZE}px`,
      width: `${MAP_SIZE * TILE_SIZE}px`,
    },
  });
  const gameContainerElement = createDOMElement(mapTree);
  gameArea.appendChild(gameContainerElement);
  renderTiles(gameContainerElement, map);
}


// Render tiles into the map
function renderTiles(container, map) {
  container.innerHTML = "";
  // Create tiles using DOM elements
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const tileType = map[y][x]; // WALL, BREAKABLE_WALL, or EMPTY

      const tileVNode = h("div", {
        style: {
          width: `${TILE_SIZE}px`,
          height: `${TILE_SIZE}px`,
          boxSizing: "border-box",
          backgroundColor: COLORS[tileType] || COLORS[EMPTY],
          border: "1px solid #888", // gridlines if you like
        },
        // optional data attrs so you can still query later
        "data-x": x,
        "data-y": y,
        "data-tile-type": tileType,
      });

      container.appendChild(createDOMElement(tileVNode));
    }
  }
}

export function updateTile(x, y, newTileType) {
  const tile = document.querySelector(`div[data-x="${x}"][data-y="${y}"]`);
  if (!tile) return;
  // repaint in-place
  tile.style.backgroundColor = COLORS[newTileType] || COLORS[EMPTY];
  tile.dataset.tileType = newTileType;
}


// Client-side animation state for each player
const playerAnimationState = new Map();

// Render all players initially
export function renderPlayers(playersData) {
  const gameContainer = document.getElementById("game-container");
  if (!gameContainer) return;

  // Handle both single object and array inputs + Update only alive players
  const players = Array.isArray(playersData) ? playersData : [playersData];
  const alivePlayers = players.filter((player) => player.isAlive);

  alivePlayers.forEach((player) => {
    // Remove existing player element if it exists (for updates)
    const existingPlayerEl = gameContainer.querySelector(`#player-${player.id}`);
    if (existingPlayerEl) {
      existingPlayerEl.remove();
    }

    // Initialize animation state for new players
    if (!playerAnimationState.has(player.id)) {
      playerAnimationState.set(player.id, {
        frame: STOPED_FRAME,
        direction: "down", // Default direction
        lastX: player.x,
        lastY: player.y,
      });
    }

    // Add lives display
    const livesElement = h(
      "div",
      {
        class: "player-lives",
      },
      `❤️ ${player.lives}`
    );

    const playerElement = h(
      "div",
      {
        id: `player-${player.id}`,
        class: "player",
        style: {
          position: "absolute",
          width: `${TILE_SIZE}px`,
          height: `${TILE_SIZE}px`,
          backgroundImage: `url(${playerSprites[player.id]})`,
          backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`, // scale to cell
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          transform: `translate(${player.x * TILE_SIZE}px, ${player.y * TILE_SIZE}px)`,
          transition: "transform 0.1s linear",
          zIndex: 10,
        },
      },
      [livesElement]
    );
    // createDOMElement(gameContainer, createDOMElement(playerElement));
    const domPlayer = createDOMElement(playerElement);
    gameContainer.appendChild(domPlayer);
  });
}

// store bomb animation handles here to clear them later
const bombAnimationHandles = new Map();

// function to render a bomb
export function renderBomb(bomb) {
  const gameContainer = document.getElementById("game-container");
  if (!gameContainer) return;

  const BOMB_SPRITE_FRAMES = 3;
  const bombVNode = h("div", {
    id: `bomb-${bomb.id}`,
    class: "bomb",
    style: {
      position: "absolute",
      backgroundPosition: `0px 0px`,
      width: `${TILE_SIZE}px`,
      height: `${TILE_SIZE}px`,
      backgroundImage: `url(${bombSprite.src})`,
      backgroundSize: `${TILE_SIZE * BOMB_SPRITE_FRAMES}px ${TILE_SIZE}px`,
      left: `${bomb.x * TILE_SIZE}px`,
      top: `${bomb.y * TILE_SIZE}px`,
      zIndex: 5,
      overflow: "hidden",
      backgroundRepeat: "no-repeat",
    },
  });

  const bombElement = createDOMElement(bombVNode);
  gameContainer.appendChild(bombElement);

  let currentFrame = 0;
  let lastFrameTime = 0;
  const frameDuration = 100; // in ms, to control animation speed

  function animateBomb(timestamp) {
    if (lastFrameTime === 0) {
      lastFrameTime = timestamp;
    }
    const tpsecoule = timestamp - lastFrameTime;

    if (tpsecoule > frameDuration) {
      lastFrameTime = timestamp - (tpsecoule % frameDuration);
      currentFrame = (currentFrame + 1) % BOMB_SPRITE_FRAMES;
      bombElement.style.backgroundPosition = `-${currentFrame * TILE_SIZE}px 0px`;
    }

    // Continue the animation loop and store the handle to be able to cancel it
    const handle = requestAnimationFrame(animateBomb);
    bombAnimationHandles.set(bomb.id, handle);
  }

  // Start the animation
  const initialHandle = requestAnimationFrame(animateBomb);
  bombAnimationHandles.set(bomb.id, initialHandle);
}

// function to remove a bomb
export function removeBomb(bombId) {
  const bombElement = document.getElementById(`bomb-${bombId}`);
  if (bombElement) {
    // Clear the animation frame before removing the element
    if (bombAnimationHandles.has(bombId)) {
      cancelAnimationFrame(bombAnimationHandles.get(bombId));
      bombAnimationHandles.delete(bombId);
    }
    bombElement.remove();
  }
}