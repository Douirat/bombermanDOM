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

export function handlePlayers(nickname, players) {
  const waitingEl = document.querySelector(".waiting");
  const playersListEl = document.querySelector(".players-list");

  if (!waitingEl || !playersListEl) {
    console.warn("handlePlayers: lobby UI not ready, skipping update");
    return;
  }
  // Update basic game state
  gameState.setState({
    actualPlayerChat: nickname,
    actualPlayer: nickname,
    players: players,
  });

  if (players.includes(nickname)) {
    waitingEl.innerHTML = "Need 2 players at least to start...";
  }

  playersListEl.innerHTML = `
    Welcome <span> ${nickname}</span>,<br>
    Current players:<br>- <span>${players.join("<br>- ")}</span><br>
    (<span>${players.length}</span> / 4)`;
}
