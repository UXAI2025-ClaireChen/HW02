let mCamera;

let mModel;
let mDetected = [];
let previousTiltY = 0;

// let serial; // variable for the serial object
let drawBoxMode = false;

// Score variables
let score = 0;

// Bird variables
let birdState = 1; // 1, 2, or 3 representing different bird images
let bird1, bird2, bird3, bird4; // Bird images

let initialY;
let birdY;  // Current bird position
let targetY;  // Target Y position for smooth movement

let birdWidth = 100;    // Bird collision width
let birdHeight = 100;   // Bird collision height
let isGameOver = false; // Game state
let birdLeft, birdRight, birdTop, birdBottom = 0;

let baseShakeAmount = 2;
let maxShakeAmount = 2;
let shakeTimer = 0;
let shakeLimit = 300;

// Tree box variables
let trunkLeft, trunkRight, trunkTop, trunkBottom = 0;
let topLeavesLeft, topLeavesRight, topLeavesTop, topLeavesBottom = 0;
let buttomLeavesLeft, buttomLeavesRight, buttomLeavesTop, buttomLeavesBottom = 0;


// Initialize background positions and settings
let bgX1 = 0;
let bgX2;
let scrollSpeed = 2;
let groundHeight = 100;

// Array to store tree obstacles
let trees = [];
let framesSinceLastSpawn = 0;
let nextSpawnTime = 0;

let faceY = 200;
let prevFaceY = 200;

function preload() {
  mCamera = createCapture(VIDEO, { flipped: true });
  mCamera.hide();
  mModel = ml5.faceMesh();

  image_folder_name = './image/';
  music_folder_name = './music/';
  bird1 = loadImage(image_folder_name + '1.png');
  bird2 = loadImage(image_folder_name + '2.png');
  bird3 = loadImage(image_folder_name + '3.png');
  bird4 = loadImage(image_folder_name + '4.png');
  music = loadSound(music_folder_name + 'Morning.mp3');
  scoreSound = loadSound(music_folder_name + 'ding.mp3');
  scoreSound.setVolume(0.1);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  // Second background starts at the right edge of the first one
  bgX2 = width;
  
  music.loop();
  mModel.detect(mCamera, updateDetected);

  if (mDetected.length > 0) {
    faceY = mDetected[0].faceOval.centerY;
    prevFaceY = faceY;
  }

  initialY = windowHeight * 0.7;
  birdY = initialY;  
  targetY = initialY;
}

function updateDetected(detected) {
  mDetected = detected;
  mModel.detect(mCamera, updateDetected);
}

// Callback function for when faceMesh outputs data
function gotFaces(results) {
  // Save the output to the faces variable
  faces = results;
}

function draw() {
  background(220);

  noStroke();
  
  // Draw sky
  fill(200, 230, 255);
  rect(0, 0, width, height - groundHeight);
  
  // Draw ground
  noStroke();
  fill(200, 255, 200);
  rect(0, height - groundHeight, width, groundHeight);
  
  // Draw mountains for both background positions
  drawMountains(bgX1);
  drawMountains(bgX2);
    
  if (!isGameOver) {
    // Move backgrounds to the left
    bgX1 -= scrollSpeed;
    bgX2 -= scrollSpeed;
    
    // Reset background positions when they move off screen
    if (bgX1 <= -width) {
      bgX1 = width;
    }
    if (bgX2 <= -width) {
      bgX2 = width;
    }
    
    // Spawn trees
    framesSinceLastSpawn++;
    if (framesSinceLastSpawn >= nextSpawnTime) {
      spawnTree();
      framesSinceLastSpawn = 0;
      nextSpawnTime = random(80, 300);
    }
  }
  
  // Update score when passing trees
  if (!isGameOver) {
     updateScore();
  }
  
  // Update and draw trees
  updateTrees();
  
  if (!isGameOver) {
    // Update bird state based on pressure value
    updateBirdState();
    
    // Update bird position with smooth movement
    let easing = 0.05;
    birdY += (targetY - birdY) * easing;
    
    // Check for collisions
    checkCollisions();
  }
  
  // draw tree's hitbox
  if (drawBoxMode == true && !isGameOver) {
    drawTreeBox();
  }
  
  // Draw the bird
  drawBird();
  
  // Draw score
  drawScore();
  
  // Draw game over message
  if (isGameOver) {
    drawGameOver();
  }

  let cameraWidth = width/4;
  let cameraHeight = (cameraWidth/mCamera.width) * mCamera.height;

  image(mCamera, width - cameraWidth, 0, cameraWidth, cameraHeight);

  console.log(isGameOver);
}


function updateScore() {
  for (let tree of trees) {    
    // If bird has passed a tree
    if (tree.x < width/3 && tree.x > width/3 - scrollSpeed * 2) {
      score++;
      scoreSound.play();
      console.log("Score updated! New score:", score);
    }
  }
}

function drawScore() {
  push();
  fill(0);
  strokeWeight(2);
  textSize(16);
  textAlign(LEFT, TOP);
  text('Score: ' + score, 20, 20);
  pop();
}

function drawTreeBox() {
  // Draw collision boxes
  push();
  noFill();
  stroke(0, 255, 0);
  strokeWeight(2);

  // tree trunk
  rect(trunkLeft, 
       trunkTop, 
       trunkRight - trunkLeft,
       trunkBottom - trunkTop);

  // top leaves
  rect(topLeavesLeft, 
       topLeavesTop, 
       topLeavesRight - topLeavesLeft,
       topLeavesBottom - topLeavesTop);

  // bottom leaves
  rect(bottomLeavesLeft, 
       bottomLeavesTop, 
       bottomLeavesRight - bottomLeavesLeft,
       bottomLeavesBottom - bottomLeavesTop);

  pop();
}


function checkCollisions() {
  // Bird hitbox (using center position)
  birdLeft = width/3 - birdWidth/2 + 20;
  birdRight = width/3 + birdWidth/2 - 20;
  birdTop = birdY - birdHeight/2 + 25;
  birdBottom = birdY + birdHeight/2 - 22;
  
  // Check collision with ground
  if (birdBottom > height - groundHeight) {
    gameOver();
    return;
  }
  
  
  // Check collision with top of screen
  if (birdTop < 0) {
    gameOver();
    return;
  }
  
  // Check collision with trees
  for (let tree of trees) {
    // Tree hitbox
    trunkLeft = tree.x - tree.trunkWidth/2;
    trunkRight = tree.x + tree.trunkWidth/2;
    trunkTop = tree.y - tree.trunkHeight;
    trunkBottom = tree.y;
      
    // Check collision with tree trunk
    if (birdRight > trunkLeft &&
        birdLeft < trunkRight &&
        birdBottom > trunkTop &&
        birdTop < trunkBottom) {
      gameOver();
      return;
    }
    
    topLeavesLeft = tree.x - tree.leafSize/2 * 0.6;
    topLeavesRight = tree.x + tree.leafSize/2 * 0.6;
    topLeavesTop = tree.y - tree.trunkHeight - tree.leafSize * 1.4;
    topLeavesBottom = tree.y - tree.trunkHeight - tree.leafSize/2 * 1.5;
    
    // Check collision with top leaves
    if (birdRight > topLeavesLeft &&
        birdLeft < topLeavesRight &&
        birdBottom > topLeavesTop &&
        birdTop < topLeavesBottom) {
      gameOver();
      return;
    }
    
    bottomLeavesLeft = tree.x - tree.leafSize * 0.7;
    bottomLeavesRight = tree.x + tree.leafSize * 0.7;
    bottomLeavesTop = tree.y - tree.trunkHeight - tree.leafSize/2 * 1.5;
    bottomLeavesBottom = tree.y - tree.trunkHeight;
    
    // Check collision with button leaves
    if (birdRight > bottomLeavesLeft &&
        birdLeft < bottomLeavesRight &&
        birdBottom > bottomLeavesTop &&
        birdTop < bottomLeavesBottom) {
      gameOver();
      return;
    }
    
  }
}

function gameOver() {
  isGameOver = true;
  birdState = 4; // Change to dead bird image
}

function drawGameOver() {
  push();
  fill(0, 0, 0, 127);
  rect(0, 0, width, height);
  
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(32);
  text('Game Over', width/2, height/2);
  
  textSize(16);
  text('Press SPACE to restart', width/2, height/2 + 40);
  pop();
}

function keyPressed() {
  if (key === ' ' && isGameOver) {
    resetGame();
  }
}

function resetGame() {
  isGameOver = false;
  birdState = 1;
  birdY = initialY;
  targetY = initialY;
  trees = [];
  bgX1 = 0;
  bgX2 = width;
  framesSinceLastSpawn = 0;
  score = 0;
  shakeTimer = 0;
}

function drawMountains(xOffset) {
  // Draw distant mountains
  fill(180, 220, 180);
  noStroke();
  
  // First mountain (lighter)
  beginShape();
  vertex(xOffset + 100, height - groundHeight);
  vertex(xOffset + 300, height - groundHeight - 150);
  vertex(xOffset + 500, height - groundHeight);
  endShape(CLOSE);
  
  // Second mountain (darker)
  fill(160, 200, 160);
  beginShape();
  vertex(xOffset + 300, height - groundHeight);
  vertex(xOffset + 500, height - groundHeight - 180);
  vertex(xOffset + 700, height - groundHeight);
  endShape(CLOSE);
  
  // Draw Clouds
  fill(255);
  ellipse(xOffset + 200, 100, 60, 40);
  ellipse(xOffset + 230, 100, 50, 35);
  ellipse(xOffset + 180, 100, 45, 30);
  
  ellipse(xOffset + 550, 150, 60, 40);
  ellipse(xOffset + 580, 150, 50, 35);
  ellipse(xOffset + 520, 150, 45, 30);
}


function spawnTree() {
  // Create a new tree with random variations
  let tree = {
    x: width,
    y: height - groundHeight,
    trunkHeight: random(50, 450),
    trunkWidth: 20,
    leafSize: 50
  };
  trees.push(tree);
} 

function updateTrees() {
  // Update and draw all trees
  for (let i = trees.length - 1; i >= 0; i--) {
    let tree = trees[i];
    
    // Move tree to the left
    tree.x -= scrollSpeed;
    
    // Draw the tree
    drawTree(tree);
    
    // Remove trees that have moved off screen
    if (tree.x < -100) {
      trees.splice(i, 1);
    }
  }
}

function drawTree(tree) {
  // Draw trunk
  fill(205, 133, 63); // Light brown trunk
  rect(tree.x - tree.trunkWidth/2, 
       tree.y - tree.trunkHeight, 
       tree.trunkWidth, 
       tree.trunkHeight);
  
  // Draw leaves with 3 circles in triangle pattern
  fill(76, 175, 80); // Bright green
  noStroke();
  
  // Top circle
  circle(tree.x, 
         tree.y - tree.trunkHeight - tree.leafSize,
         tree.leafSize);
  
  // Bottom left circle
  circle(tree.x - tree.leafSize/3, 
         tree.y - tree.trunkHeight - tree.leafSize/3,
         tree.leafSize);
  
  // Bottom right circle
  circle(tree.x + tree.leafSize/3, 
         tree.y - tree.trunkHeight - tree.leafSize/3,
         tree.leafSize);
}

function updateBirdState() {
  if (mDetected.length > 0) {
    prevFaceY = faceY;
    faceY = mDetected[0].faceOval.centerY;
    let faceMovement = prevFaceY - faceY;
    let movementScale = 6;
    targetY -= faceMovement * movementScale;
  }
}


function drawBird() {
  push();
  imageMode(CENTER);
  let currentBird;
  
  let drawX = width/3;
  let drawY = birdY;
  
  if (birdState === 2 || birdState === 3) {
    let currentShake = map(shakeTimer, 0, shakeLimit, 
                          baseShakeAmount, maxShakeAmount);
    drawX += random(-currentShake, currentShake);
    drawY += random(-currentShake, currentShake);
    
    let remainingTime = ceil((shakeLimit - shakeTimer) / 60);
    fill(255, 0, 0);
    textSize(12);
    text(remainingTime, drawX - 4, drawY - 40);
  }
  
  if (drawBoxMode == true) {
    // Draw bird hitbox
    noFill();
    stroke(255, 0, 0); // red border
    strokeWeight(2);

    rect(birdLeft, birdTop, birdRight - birdLeft, birdBottom - birdTop);
  }
  
  // Select the appropriate bird image based on state
  switch(birdState) {
    case 1:
      currentBird = bird1;
      break;
    case 2:
      currentBird = bird2;
      break;
    case 3:
      currentBird = bird3;
      break;
    case 4:
      currentBird = bird4;
      break;
  }
  
  // Draw the bird at its current position
  image(currentBird, drawX, drawY, 100, 100);
  pop();
}