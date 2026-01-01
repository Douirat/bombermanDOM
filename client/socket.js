import {
  handleTimer,
  handleStart,
  handlePlayers,
  handlePlayersUpdate,
  handleChat,
  handleBombPlaced,
  handleBombExploded,
  handlePlayerHit,
  handlePlayerEliminated,
  handleInterrupt,
  handleGameOver,
} from "./wsHandler.js";

import { removePowerup, renderSinglePowerup } from "./map.js";
import { gameState } from "./main.js";
import { el as h, createDOMElement } from "../framework/minidom.js";

export function socketHandler(nickname, socket, send, close) {
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // console.log("the capsule of data is a certain time: ---> ", data);
    
    switch (data.type) {
      case "timer":
        handleTimer(data);
        break;
      case "gameStart":
        handleStart(data.map, data.playersData);
        break;
      case "playersList":
        handlePlayers(nickname, data.players);
        break;
      case "playersUpdate": // Player position updates
        handlePlayersUpdate(data.playersData);
        break;
      case "chatMessage":
        handleChat(data, nickname);
        break;
      case "bombPlaced": // Bomb placement
        handleBombPlaced(data.bomb);
        break;
      case "bombExploded": // Bomb explosion.
        // Pass all data properties sent by server.
        handleBombExploded(
          data.bombId,
          data.x,
          data.y,
          data.affectedTiles,
          data.updatedMap,
          data.hitPlayers
        );
        break;
      case "playerHit": // Update state.
        handlePlayerHit(data);
        break;
      case "playerEliminated":
        handlePlayerEliminated(data);
        break;
      case "gameInterrupt":
        handleInterrupt(close);
        break;
      case "gameOver":
        handleGameOver(data);
        break;
      case "powerupCollection": // Powerup collection.
        const currentPowerups = gameState.state.powerupsData || [];
        const updatedPowerups = currentPowerups.filter((p) => p.id !== data.powerupId);
        gameState.setState({ powerupsData: updatedPowerups });
        removePowerup(data.powerupId);
        break;
      case "powerupAppeared":
        const existingPowerups = gameState.state.powerupsData || [];
        gameState.setState({
          powerupsData: [...existingPowerups, data.powerup],
        });
        renderSinglePowerup(data.powerup);
        break;
      default:
        console.warn("Unhandled message type:", data.type);
    }
  };
}


export function connectToSocket(nickname) {
  return new Promise((resolve, reject) => {
    showConnectionStatus("connecting"); // UI update, asynchronous connection.
    
    const socket = new WebSocket(`ws://${window.location.hostname}:3000`);
    let connectionTimeout;

    socket.onopen = () => {
      clearTimeout(connectionTimeout);
      showConnectionStatus("connected");
      socket.send(JSON.stringify({ type: "nickname", nickname }));
      resolve({
        socket,
        send: (data) => socket.readyState === 1 && socket.send(JSON.stringify(data)),
        close: () => socket.close(1000),
      });
    };

    socket.onerror = () => showConnectionStatus("error");
    socket.onclose = (event) => event.code !== 1000 && reject();

    // Timeout after 5 seconds
    connectionTimeout = setTimeout(() => {
      socket.readyState === 0 && socket.close(1000);
      reject();
    }, 5000);
  });
}

function showConnectionStatus(state) {
  const statusElement = document.querySelector(".connection-status") || createStatusElement();
  statusElement.textContent = ["...Connecting", "Connected", "Error"][
    ["connecting", "connected", "error"].indexOf(state)
  ];
}

function createStatusElement() {
  const statusTree = h("div", {
    class: "connection-status",
    style: {
      position: "fixed",
      top: "10px",
      right: "10px",
      padding: "5px 10px",
      zIndex: "10",
    },
  });

  const status = createDOMElement(statusTree);
  const main = document.querySelector(".main");
  main.appendChild(status);
  return status;
}
