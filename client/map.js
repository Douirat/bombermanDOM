import { el as h, createDOMElement } from "../framework/minidom.js";

export const TILE_SIZE = 40;
const MAP_SIZE = 13; // 13x13
const BREAKABLE_WALL = 2;
const WALL = 1;
const EMPTY = 0;

const COLORS = {
  [WALL]: "#555555",
  [BREAKABLE_WALL]: "#bb6633",
  [EMPTY]: "#00ff80ff",
};