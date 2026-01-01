import { Listener } from "../framework/event.js";
import { updatePlayerPosition } from "./map.js";

let sendSocketMessage; // Use WS' rtesolved send()

export function setupPlayerInputHandler(sendFunc) {
  sendSocketMessage = sendFunc;
  Listener(window, "keydown", handleKeyDown);
}

const KEY_TO_DIRECTION = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

function handleKeyDown(event) {
  if (!sendSocketMessage) return; //: socket not ready yet

  const chatInput = document.querySelector("#chat-input");
  if (chatInput?.contains(document.activeElement)) return;

  const direction = KEY_TO_DIRECTION[event.key];
  if (direction) {
    event.preventDefault(); //so arrows won't scroll
    sendSocketMessage({ type: "playerMove", direction });
    return;
  }

  if (event.key === " ") {
    event.preventDefault();
    sendSocketMessage({ type: "placeBomb" });
  }
}

// Centralized function to handle player removal from DOM and state
export function removePlayersFromGame(playersToRemove) {
  if (!playersToRemove.length) return;
  playersToRemove.forEach((player) => {
    removePlayerFromDOM(player.id);
  });
}

// Remove specific player from DOM
export function removePlayerFromDOM(playerId) {
  const gameContainer = document.getElementById("game-container");
  if (!gameContainer) return;

  const playerElement = gameContainer.querySelector(`#player-${playerId}`);
  if (playerElement) {
    playerElement.classList.add("eliminated");
    setTimeout(() => playerElement.remove(), 500);
  }
}

export function updateOrCreatePlayer(player) {
  const gameContainer = document.getElementById("game-container");
  if (!gameContainer) return;

  const existingPlayer = gameContainer.querySelector(`#player-${player.id}`);
  if (existingPlayer) {
    // move the existing div
    updatePlayerPosition(existingPlayer, player);
  } else {
    // fall back to creating it (or let renderPlayers handle it)
    // e.g. renderPlayers([player])
  }
}