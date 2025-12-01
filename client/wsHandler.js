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

export function handleChat(data, nickname) {
  const isSelf = data.sender === nickname;
  const messageTree = h(
    "li",
    {
      class: `chat-message ${isSelf ? "message-self" : ""}`,
    },
    [h("span", { class: "sender" }, `${data.sender}:`), h("span", {}, `${data.content}`)]
  );

  const chatMessages = document.querySelector("#chat-messages");
  const messageEl = createDOMElement(messageTree);
  chatMessages.appendChild(messageEl);

  chatMessages.scrollTop = chatMessages.scrollHeight;
  if (!gameState.state.gameStarted) {
    document.querySelector("#chat-input")?.focus();
  }
}

export function handleTimer(data) {
  const waiting = document.querySelector(".waiting");
  const secondsSpan = waiting.querySelector(".second") || document.createElement("span");

  secondsSpan.className = "second";
  secondsSpan.textContent = data.value;

  waiting.innerHTML = "";
  if (data.phase === 1) {
    waiting.append("Waiting for players, ", secondsSpan, "s remaining");
  } else if (data.phase === 2) {
    waiting.append("Game is starting in ", secondsSpan, "s!");
  }
}
