let bgImage;
let bgMusic;
let gameStarted = false;
let isMusicAvailable = true;

let levelNo = 1;
let numLevels = 3;
let cols, rows;
let w = 60;
let grid = [];
let player;
let walls;
let goal;
let powerUps;
let invincible = false;

let startTime;
let elapsedTime = 0;
let timeLimit = 300000;

let POWER_UP_TYPES;

let levelStates = [];
let redoButton;

class Cell {
  constructor(i, j) {
    this.i = i;
    this.j = j;
    this.walls = [true, true, true, true];
    this.visited = false;
  }

  checkNeighbors() {
    let neighbors = [];

    let top = grid[index(this.i, this.j - 1)];
    let right = grid[index(this.i + 1, this.j)];
    let bottom = grid[index(this.i, this.j + 1)];
    let left = grid[index(this.i - 1, this.j)];

    if (top && !top.visited) neighbors.push(top);
    if (right && !right.visited) neighbors.push(right);
    if (bottom && !bottom.visited) neighbors.push(bottom);
    if (left && !left.visited) neighbors.push(left);

    if (neighbors.length > 0) {
      let r = floor(random(0, neighbors.length));
      return neighbors[r];
    } else {
      return undefined;
    }
  }
}

class Item {
  constructor(x, y) {
    this.sprite = new Sprite(x, y, w * 0.4, w * 0.4, 'static');
    this.type = random(POWER_UP_TYPES);
    this.sprite.color = this.type.color;
    this.sprite.itemInstance = this;
  }

  applyEffect(player) {
    switch (this.type.type) {
      case 'speed':
        player.maxSpeed *= 1.5;
        setTimeout(() => { player.maxSpeed /= 1.5; }, this.type.duration);
        break;
      case 'invincibility':
        invincible = true;
        player.color = color(255, 215, 0);
        setTimeout(() => {
          invincible = false;
          player.color = color(0, 200, 0);
        }, this.type.duration);
        break;
      case 'shrink':
        let originalSize = player.scale;
        player.scale = 0.5;
        setTimeout(() => { player.scale = originalSize; }, this.type.duration);
        break;
    }
    this.sprite.remove();
  }
}

function preload() {
  myfont = loadFont("Roboto-Black.ttf");
  bgImage = loadImage('moody_blue.jpeg');

  try {
    bgMusic = loadSound('bg_music.mp3',
      () => { console.log("Music loaded successfully"); },
      (error) => {
        console.warn("Failed to load music:", error);
        isMusicAvailable = false;
      }
    );
  } catch (error) {
    console.warn("Error occurred while loading music:", error);
    isMusicAvailable = false;
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  if (isMusicAvailable && bgMusic && typeof bgMusic.loop === 'function') {
    bgMusic.loop();
  } else {
    console.warn("Background music is not available. Continuing without music.");
  }

  noLoop();

  POWER_UP_TYPES = [
    { type: 'speed', color: color(0, 0, 255), duration: 5000 },
    { type: 'invincibility', color: color(255, 215, 0), duration: 3000 },
    { type: 'shrink', color: color(0, 255, 255), duration: 7000 }
  ];

  redoButton = createButton('Redo Level');
  redoButton.position(width - 120, 20);
  redoButton.mousePressed(redoLevel);
  redoButton.hide();
}

function draw() {
  if (!gameStarted) {
    showIntroScreen();
  } else {
    playMazeGame();
  }
}

function showIntroScreen() {
  background(bgImage);
  let shadowOffset = 5;

  fill(0, 0, 0, 150);
  textSize(50);
  textAlign(CENTER, CENTER);
  text("MAZE EXPLORER", width / 2 + shadowOffset, height / 2 + shadowOffset - 30);

  fill(255, 255, 255, 220);
  text("MAZE EXPLORER", width / 2, height / 2 - 30);

  textSize(24);
  fill(255, 255, 255, 200);
  text("Press any key to start", width / 2, height / 2 + 50);

  if (!isMusicAvailable) {
    textSize(18);
    fill(255, 200, 200);
    text("Note: Background music is not available", width / 2, height / 2 + 100);
  }

  textSize(18);
  fill(0, 0, 0, 100);
  textAlign(RIGHT, BOTTOM);
  text("By Ashwin Rao, 8B,\nVivaan Barnwal, 7A,\nVoyagers", width - 20 + shadowOffset, height - 20 + shadowOffset);

  fill(255, 255, 255, 220);
  text("By Ashwin Rao, 8B,\nVivaan Barnwal, 7A,\nVoyagers", width - 20, height - 20);
}

function keyPressed() {
  if (!gameStarted) {
    gameStarted = true;
    startTime = millis();
    setupMaze();
    loop();
    return false;
  }
}

function setupMaze() {
  w = 60 - 15 * (levelNo - 1);
  cols = floor(width / w);
  rows = floor(height / w);

  grid = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let cell = new Cell(i, j);
      grid.push(cell);
    }
  }

  generateMaze();
  createWalls();

  player = new Sprite(w / 2, w / 2, w * 0.6, w * 0.6, 'dynamic');
  player.color = color(0, 200, 0);
  player.friction = 0.2;
  player.maxSpeed = 2;
  player.rotationLock = true;

  let lastCell = grid[grid.length - 1];
  goal = new Sprite(lastCell.i * w + w / 2, lastCell.j * w + w / 2, w * 0.6, w * 0.6, 'static');
  goal.color = color(255, 165, 0);

  placePowerUps();

  storeLevelState();
}

function generateMaze() {
  let current = grid[0];
  current.visited = true;
  let stack = [];

  while (true) {
    let next = current.checkNeighbors();
    if (next) {
      next.visited = true;
      stack.push(current);
      removeWalls(current, next);
      current = next;
    } else if (stack.length > 0) {
      current = stack.pop();
    } else {
      break;
    }
  }
}

function createWalls() {
  walls = new Group();
  walls.collider = 'static';
  walls.color = color(0);

  for (let cell of grid) {
    let x = cell.i * w;
    let y = cell.j * w;

    if (cell.walls[0]) new walls.Sprite(x + w / 2, y, w, 4);
    if (cell.walls[1]) new walls.Sprite(x + w, y + w / 2, 4, w);
    if (cell.walls[2]) new walls.Sprite(x + w / 2, y + w, w, 4);
    if (cell.walls[3]) new walls.Sprite(x, y + w / 2, 4, w);
  }
}

function placePowerUps() {
  powerUps = new Group();
  let powerUpCount = floor(random(2, 4 + levelNo));

  for (let i = 0; i < powerUpCount; i++) {
    let cell;
    do {
      cell = random(grid);
    } while (cell === grid[0] || cell === grid[grid.length - 1]);

    let powerUp = new Item(cell.i * w + w / 2, cell.j * w + w / 2);
    powerUps.add(powerUp.sprite);
  }
}

function storeLevelState() {
  let state = {
    levelNo: levelNo,
    grid: JSON.parse(JSON.stringify(grid)),
    playerPos: { x: player.x, y: player.y },
    goalPos: { x: goal.x, y: goal.y },
    powerUps: powerUps.map(pu => ({ x: pu.x, y: pu.y, type: pu.itemInstance.type })),
    startTime: startTime,
    elapsedTime: elapsedTime,
    timeLimit: timeLimit
  };
  levelStates[levelNo] = state;
}

function redoLevel() {
  let state = levelStates[levelNo];
  if (state) {
    levelNo = state.levelNo;
    grid = state.grid;
    player.x = state.playerPos.x;
    player.y = state.playerPos.y;
    goal.x = state.goalPos.x;
    goal.y = state.goalPos.y;

    powerUps.removeAll();
    for (let pu of state.powerUps) {
      let powerUp = new Item(pu.x, pu.y);
      powerUp.type = pu.type;
      powerUps.add(powerUp.sprite);
    }

    startTime = state.startTime;
    elapsedTime = state.elapsedTime;
    timeLimit = state.timeLimit;

    redoButton.hide();
    loop();
  }
}

function newLevel() {
  levelNo++;
  if (levelNo > numLevels) {
    endGame("You've completed all levels!");
    return;
  }

  for (let sprite of allSprites) {
    sprite.remove();
  }

  walls.removeAll();
  clear();

  if (goal) {
    goal.remove();
  }

  timeLimit += 150000 * (levelNo - 1);

  setupMaze();
  startTime = millis();
  elapsedTime = 0;
  loop();
  redoButton.hide();
}

function playMazeGame() {
  background(220);

  elapsedTime = millis() - startTime;
  let remainingTime = max(0, timeLimit - elapsedTime);

  let minutes = floor(remainingTime / (60 * 1000));
  let seconds = floor((remainingTime % (60 * 1000)) / 1000);

  textAlign(LEFT, TOP);
  textSize(24);
  textFont(myfont);
  fill(0);
  text(`Time Left: ${nf(minutes, 2)}:${nf(seconds, 2)}`, 20, 20);

  if (remainingTime <= 0) {
    if (levelNo == numLevels) {
      endGame("Time's Up!");
      return;
    } else {
      textAlign(CENTER, CENTER);
      textSize(32);
      textFont(myfont);
      fill(0);
      text("Time's Up! Next Level!", width / 2, height / 2);
      newLevel();
      return;
    }
  }

  const acceleration = 0.2 + (0.05 * (levelNo - 1));
  const deceleration = 0.1;
  let moving = false;

  if (kb.pressing('left')) {
    player.vel.x -= acceleration;
    moving = true;
  }
  if (kb.pressing('right')) {
    player.vel.x += acceleration;
    moving = true;
  }
  if (kb.pressing('up')) {
    player.vel.y -= acceleration;
    moving = true;
  }
  if (kb.pressing('down')) {
    player.vel.y += acceleration;
    moving = true;
  }

  if (!moving) {
    player.vel.x *= (1 - deceleration);
    player.vel.y *= (1 - deceleration);
  }

  for (let cell of grid) {
    if (cell.visited) {
      noStroke();
      fill(200, 100, 200, 50);
      rect(cell.i * w, cell.j * w, w, w);
    }
  }

  for (let powerUp of powerUps) {
    if (player.colliding(powerUp)) {
      powerUp.itemInstance.applyEffect(player);
      powerUp.remove();
    }
  }

  player.collides(walls);

  if (player.colliding(goal)) {
    if (levelNo == numLevels) {
      endGame("You Win!");
    } else {
      textAlign(CENTER, CENTER);
      textSize(32);
      textFont(myfont);
      fill(0);
      text("You Win! Next Level!", width / 2, height / 2);
      sleep(1500).then(() => {
        newLevel();
      });
    }
  }

  allSprites.draw();

  textAlign(LEFT, TOP);
  textSize(16);
  fill(0);
  text(`Invincible: ${invincible}`, 10, height - 30);
}

function endGame(message) {
  textAlign(CENTER, CENTER);
  textSize(32);
  textFont(myfont);
  fill(0);
  text(message, width / 2, height / 2);
  redoButton.show();
  noLoop();
}

function removeWalls(a, b) {
  let x = a.i - b.i;
  if (x === 1) {
    a.walls[3] = false;
    b.walls[1] = false;
  } else if (x === -1) {
    a.walls[1] = false;
    b.walls[3] = false;
  }

  let y = a.j - b.j;
  if (y === 1) {
    a.walls[0] = false;
    b.walls[2] = false;
  } else if (y === -1) {
    a.walls[2] = false;
    b.walls[0] = false;
  }
}

function index(i, j) {
  if (i < 0 || j < 0 || i >= cols || j >= rows) {
    return -1;
  }
  return i + j * cols;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (gameStarted) {

    for (let sprite of allSprites) {
      sprite.remove();
    }
    walls.removeAll();
    setupMaze();
  }
}

function mousePressed() {
  if (!gameStarted) {
    keyPressed();
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}