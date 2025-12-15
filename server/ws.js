import {
  setupGame,
  addPlayer,
  removePlayerFromInstance,
  broadcast,
  countdown,
  movePlayer,
  handleBombPlacement,
} from "./server.js";

export function wsServer(ws, gameInstances, currentInstance) {
  ws.on("connection", (ws) => {
    // connection test
    ws.send(JSON.stringify({ type: "connection", status: "established" }));

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case "nickname":
            let added = false;
            let targetInstance = currentInstance;
            if (
              !targetInstance ||
              targetInstance.clients.size >= 4 ||
              targetInstance.status === "started" ||
              targetInstance.status === "phase2"
            ) {
              console.log("Creating new instance for player:", data.nickname);
              targetInstance = setupGame();
              gameInstances.push(targetInstance);
              currentInstance = targetInstance;
            }

            added = addPlayer(targetInstance, ws, data.nickname);
            if (added) ws.send(JSON.stringify({ type: "acknowledge" }));
            else {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Failed to join game instance",
                })
              );
            }
            break;

          case "chatMessage":
            if (ws.gameInstance) {
              broadcast(ws.gameInstance, {
                type: "chatMessage",
                content: data.content,
                sender: ws.gameInstance.clients.get(ws),
              });
            }
            break;

          case "timer":
            if (
              ws.gameInstance &&
              ws.gameInstance.clients.size >= 2 &&
              ws.gameInstance.status === "waiting"
            ) {
              countdown(ws.gameInstance, data.value, 1);
            }
            break;

          case "playerMove":
            if (ws.gameInstance) {
              movePlayer(ws, data.direction);
            }
            break;

          case "placeBomb":
            if (ws.gameInstance) handleBombPlacement(ws);
            break;
        }
      } catch (err) {
        console.error("Error parsing message:", err);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid message format",
          })
        );
      }
    });

    ws.on("close", () => {
      if (!ws.gameInstance) return;
      const instance = ws.gameInstance;
      removePlayerFromInstance(instance, ws);

      if (instance.clients.size === 0) {
        const index = gameInstances.indexOf(instance);
        if (index >= 0) {
          gameInstances.splice(index, 1);
          if (currentInstance === instance) {
            currentInstance = gameInstances.at(-1) || null;
          }
        }
      }
    });
  });
}


export function deployMap() {
  const MAP_SIZE = 13;
  const EMPTY = 0;
  const WALL = 1;
  const BREAKABLE_WALL = 2;
  const map = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      // solid walls
      if (x === 0 || y === 0 || x === MAP_SIZE - 1 || y === MAP_SIZE - 1) {
        map[y][x] = WALL;
      }
      // breakable walls
      else if (x % 2 === 0 && y % 2 === 0) {
        map[y][x] = WALL;
      } else if (
        (x < 3 && y < 3) ||
        (x > MAP_SIZE - 4 && y < 3) ||
        (x < 3 && y > MAP_SIZE - 4) ||
        (x > MAP_SIZE - 4 && y > MAP_SIZE - 4)
      ) {
        map[y][x] = EMPTY;
      } else {
        map[y][x] = Math.random() > 0.7 ? BREAKABLE_WALL : EMPTY;
      }
    }
  }
  return map;
}
