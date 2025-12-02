
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
