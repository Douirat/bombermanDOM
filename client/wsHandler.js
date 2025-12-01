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


export function handleStart(map, playersData) {
  const title = document.querySelector("#game-area h2");
  document.querySelector(".waiting").remove();
  title.innerHTML = "Game started!";
  gameState.setState({
    gameStarted: true,
    map: map,
    playersData: playersData,
    bombsData: [],
    powerupsData: [],
  });
  renderMap(map);
  renderPlayers(playersData);
  handlePlayersUpdate(playersData);
  document.activeElement.blur();
}

export function handleInterrupt(close) {
  close(); // Close WS , thus remove left user from game instance
  alert("You must be at least 2 players."); // Only after close()
  gameState.setState({ gameStarted: false, playersData: [], bombsData: [] });
  gameEvents.destroy(); // Clear all event listeners from the DOM
  renderLogin(); // Automatically removes game container from DOM
}

// Player position updates + Centralized sync with game state
export function handlePlayersUpdate(playersData) {
  const currentState = gameState.state;
  const currentPlayersData = currentState.playersData || [];

  // Find eliminated players
  const eliminatedPlayers = currentPlayersData.filter((currentPlayer) => {
    const updatedPlayer = playersData.find((p) => p.id === currentPlayer.id);
    return updatedPlayer ? !updatedPlayer.isAlive && currentPlayer.isAlive : false;
  });

  // Remove eliminated players
  eliminatedPlayers.forEach((player) => {
    removePlayerFromDOM(player.id);
  });

  // Find players who left by comparing IDs
  const newPlayerIds = new Set(playersData.map((player) => player.id));
  const playersWhoLeft = currentPlayersData.filter((player) => !newPlayerIds.has(player.id));

  // Remove departed players
  if (playersWhoLeft.length > 0) {
    removePlayersFromGame(playersWhoLeft);
  }
  // Update or create remaining players
  playersData.forEach((player) => {
    updateOrCreatePlayer(player);
  });

  gameState.setState({ playersData: playersData }); // Update game state
}

// Handler for bomb placement
export function handleBombPlaced(bomb) {
  const currentBombs = gameState.state.bombsData || [];
  gameState.setState({ ...gameState.state, bombsData: [...currentBombs, bomb] });
  renderBomb(bomb); // Render the bomb on the map
}
// Handler for bomb explosion
export function handleBombExploded(bombId, x, y, affectedTiles, updatedMap, hitPlayers) {
  const gameStateMap = gameState.state.map || [];
  const gameContainer = document.getElementById("game-container");

  removeBomb(bombId);

  affectedTiles.forEach((tile) => {
    const newTileType = updatedMap[tile.y][tile.x];
    updateTile(tile.x, tile.y, newTileType); // Update only affected tiles
    if (gameStateMap[tile.y]) gameStateMap[tile.y][tile.x] = newTileType; // Update local game state
  });

  // Met à jour l'état local du jeu avec la nouvelle map
  gameState.setState({ ...gameState.state, map: updatedMap });

  if (affectedTiles && typeof renderExplosion === "function") {
    renderExplosion(affectedTiles); // Update explosions
  }

  // Only update specific players that were affected
  if (hitPlayers && hitPlayers.length > 0) {
    const playersData = gameState.state.playersData;
    hitPlayers.forEach((hitPlayerID) => {
      const playerData = playersData.find((p) => p.id === hitPlayerID);
      // Update only this specific player's visual representation
      if (playerData) {
        renderPlayers(playerData);
      }
    });
  }

  // Re-render powerups safely
  const powerupsData = gameState.state.powerupsData || [];
  if (gameContainer) {
    gameContainer.querySelectorAll(".powerup").forEach((el) => el.remove());
  }
  if (powerupsData.length > 0) {
    renderPowerups(powerupsData);
  }
}


// This function only updates state
export function handlePlayerHit(data) {
  const playersData = gameState.state.playersData.map((player) => {
    if (player.nickname === data.nickname) {
      return { ...player, lives: data.lives, isAlive: data.isAlive };
    }
    return player;
  });
  gameState.setState({ playersData });
}

export function handleGameOver(data) {
  const gameOverContainer = document.createElement("div");
  gameOverContainer.className = "game-over-container";
  gameOverContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    color: white;
    font-size: 24px;
    text-align: center;
  `;

  let message = data.winner ? `🎉 ${data.winner} wins the game! 🎉` : "💥 Game ended in a draw! 💥";

  if (data.eliminatedPlayers.length > 0) {
    message += `<br><small>Eliminated players: ${data.eliminatedPlayers.join(", ")}</small>`;
  }

  const messageElement = document.createElement("div");
  messageElement.innerHTML = message;
  messageElement.style.marginBottom = "20px";

  // Create the Play Again button
  const playAgainButton = document.createElement("button");
  playAgainButton.textContent = "Play Again";
  playAgainButton.style.cssText = `
    padding: 12px 24px;
    font-size: 18px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s;
  `;

  // Add hover effect
  playAgainButton.onmouseover = () => {
    playAgainButton.style.backgroundColor = "#45a049";
  };
  playAgainButton.onmouseout = () => {
    playAgainButton.style.backgroundColor = "#4CAF50";
  };

  // Add click handler to reload the page
  playAgainButton.onclick = () => {
    window.location.reload();
  };

  gameOverContainer.appendChild(messageElement);
  gameOverContainer.appendChild(playAgainButton);
  document.body.appendChild(gameOverContainer);

  // Disable game controls
  const gameContainer = document.getElementById("game-container");
  if (gameContainer) {
    gameContainer.style.pointerEvents = "none";
  }
}
