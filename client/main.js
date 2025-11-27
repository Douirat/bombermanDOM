import { Listener } from "../framework/event.js";
import { createStore } from "../framework/store.js";
// import { el as h, createDOMElement } from "../framework/minidom.js";

// import { setupPlayerInputHandler } from "./player.js";
// import { connectToSocket, socketHandler } from "./socket.js";

// Modules instances
export const gameEvents = {
  onEvent: Listener,
};

export const gameState =  createStore({
  players: [],
  actualPlayer: "",
  actualPlayerChat: "",
  gameStarted: false,
  map: [],
  playersData: [], // Array of { nickname, x, y, id } for all players
  bombsData: [], // Array of { id, x, y } for active bombs
  powerupsData: [],
});

renderLogin(); // First entry

export function renderLogin() {
  const loginForm = h("form", {
    class: "login‐form",
    children: [
      h("h2", {}, "Enter your name"),
      h("p", { class: "error" }),
      h("div", {
        class: "input-group",
        children: [
          h("input", { placeholder: "Nickname…", name: "nickname", required: true }),
          h("button", { type: "submit", class: "submit-button" }, "Start Game"),
        ],
      }),
    ],
    onsubmit: handleLogin, // bind directly by prop
  });

  const container = document.querySelector(".main");
  // completely replace any old content
  container.innerHTML = "";
  // turn your VNode into a real DOM node
  const domForm = createDOMElement(loginForm);
  // insert it
  container.appendChild(domForm);
  // now you can safely query() it
  container.querySelector("input[name=nickname]").focus();
}