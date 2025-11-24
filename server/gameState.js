const state = {
  players: [],
  bombs: [],
  explosions: [],
  grid: generateGrid(),
  winner: null
};

const spawnPoints = [
  { x: 1 * 32, y: 1 * 32 },
  { x: 11 * 32, y: 1 * 32 },
  { x: 1 * 32, y: 9 * 32 },
  { x: 11 * 32, y: 9 * 32 }
];

export function addPlayer(nickname) {
  const id = `p${state.players.length + 1}`;
  const spawn = spawnPoints[state.players.length % spawnPoints.length];

  state.players.push({
    id,
    nickname,
    x: spawn.x,
    y: spawn.y,
    lives: 3,
    alive: true
  });
}

export function update() {
  const toExplode = [];

  state.bombs.forEach(bomb => {
    bomb.timer--;
    if (bomb.timer <= 0) {
      toExplode.push(bomb);
    }
  });

  state.bombs = state.bombs.filter(b => b.timer > 0);

  toExplode.forEach(bomb => {
    state.explosions.push({ i: bomb.i, j: bomb.j, ttl: 20 });
  });

  state.explosions.forEach(e => e.ttl--);
  state.explosions = state.explosions.filter(e => e.ttl > 0);
}

export function getGameState() {
  return state;
}

function generateGrid() {
  const rows = 11;
  const cols = 13;
  const grid = [];

  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      if (y === 0 || y === rows - 1 || x === 0 || x === cols - 1) {
        row.push(2); // wall
      } else if (y % 2 === 0 && x % 2 === 0) {
        row.push(2); // inner wall
      } else if (Math.random() < 0.3) {
        row.push(1); // block
      } else {
        row.push(0); // empty
      }
    }
    grid.push(row);
  }

  return grid;
}
