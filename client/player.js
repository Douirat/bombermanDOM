import { Listener } from "../framework/event.js";
// import { updatePlayerPosition } from "./map.js";

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