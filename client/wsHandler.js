import { createDOMElement, el as h } from "../framework/minidom.js";
import { gameEvents, gameState, renderLogin } from "./main.js";
import { removePlayersFromGame, removePlayerFromDOM } from "./player.js";
import { updateOrCreatePlayer } from "./player.js";
import {
  renderMap,
  renderPlayers,
  renderBomb,
  removeBomb,
  renderPowerups,
  renderExplosion,
  updateTile,
} from "./map.js";