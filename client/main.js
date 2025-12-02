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

export function renderLobby() {
  // Build the virtual-DOM tree
  const lobbyTree = h("main", { class: "main lobby-flex" }, [
    h("div", { id: "game-area" }, [
      h("h2", {}, "Information:"),
      h("h3", { class: "players-list" }),
      h("h4", { class: "waiting" }),
      h("div", { id: "game-container" }),
    ]),
    h("div", { id: "chat" }, [
      h("h2", { style: { padding: "10px 15px" } }, "Chat"),
      h("ul", { id: "chat-messages" }),
      h("form", { id: "chat-form" }, [
        h("input", {
          id: "chat-input",
          autocomplete: "off",
          placeholder: "Type a message…",
        }),
        h("button", { type: "submit" }, "Send"),
      ]),
    ]),
  ]);

  // Clear old content (e.g. the login form) and mount the new lobby
  document.body.innerHTML = "";
  const lobbyEl = createDOMElement(lobbyTree);
  document.body.appendChild(lobbyEl);

  // Focus the chat input once c’est dans le DOM
  document.querySelector("#chat-input")?.focus();
}

function confirmExit() {
  gameEvents.onEvent(window, "beforeunload", function (e) {
    e.preventDefault(); // Prevents unloading content
    return ""; // For legacy browser support
  });
}

async function handleLogin(e) {
  e.preventDefault();
  const nickname = e.target.nickname.value.trim();
  if (!nickname) return;

  document.querySelector(".submit-button").disabled = true;

  try {
    renderLobby(); // Note: Keep first to show connectionStatus
    confirmExit(); // Confirmation dialog before leaving the game

    const { socket, send, close } = await connectToSocket(nickname);

    socketHandler(nickname, socket, send, close); // Set WS handlers

    const chatForm = document.querySelector("#chat-form");
    if (chatForm) {
      gameEvents.onEvent(chatForm, "submit", sendMessage(send, nickname));
    }

    gameState.setState({ gameStarted: true, actualPlayer: nickname });

    // Setup player input handler after successful connection
    setupPlayerInputHandler(send);
  } catch (error) {
    console.error("Login error:", error instanceof Error ? error : new Error(String(error)));
  }
}

function sendMessage(send, nickname) {
  return function (e) {
    e.preventDefault();
    const messageInput = document.querySelector("#chat-input");
    const message = messageInput.value.trim();

    if (message) {
      try {
        send({
          type: "chatMessage",
          sender: nickname,
          content: message,
        });
        messageInput.value = "";
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    }
  };
}