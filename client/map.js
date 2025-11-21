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
