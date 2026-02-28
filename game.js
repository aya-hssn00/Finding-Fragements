// Game configuration
const CONFIG = {
    canvasWidth: 1280,
    canvasHeight: 720,
    worldWidth: 1280, // Match canvas width initially
    worldHeight: 720, // Match canvas height initially
    playerRadius: 20,
    acceleration: 0.2,
    friction: 0.95,
    treasureCount: 8,
    oxygenMax: 100,
    oxygenDecreaseRate: 0.5,
    enemyCount: 5,
    bubbleCount: 30
};

// Game state
let gameState = {
    player: {
        x: 640, // Center of canvas
        y: 360,
        vx: 0,
        vy: 0,
        radius: CONFIG.playerRadius,
        walking: false,
        frame: 0,
        lightAngle: 0
    },
    treasures: [],
    enemies: [],
    bubbles: [],
    camera: { x: 0, y: 0 },
    collectedTreasures: 0,
    oxygen: CONFIG.oxygenMax,
    gameStarted: false,
    gameEnded: false,
    gameOver: false,
    gameWon: false,
    keys: {},
    messages: { current: '', timer: 0 },
    screenShake: 0,
    fadeAlpha: 1,
    fadeDirection: -1,
    startTime: 0,
    currentTime: 0,
    timerInterval: null,
    lastOxygenDecrease: 0
};

// Get canvas elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const treasuresSpan = document.getElementById('treasuresCollected');
const oxygenBar = document.getElementById('oxygenBar');
const messageDisplay = document.getElementById('messageDisplay');
const startScreen = document.getElementById('startScreen');
const winScreen = document.getElementById('winScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const oxygenLowScreen = document.getElementById('oxygenLowScreen');
const timerSpan = document.getElementById('timerValue');

// Initialize treasures - place them around the visible area
function createTreasures() {
    const treasures = [];
    const types = ['pearl', 'chest', 'crown', 'ring'];
    const positions = [
        [200, 200], [400, 150], [600, 300], [800, 200],
        [300, 500], [500, 600], [700, 550], [900, 450]
    ];
    
    for (let i = 0; i < CONFIG.treasureCount; i++) {
        treasures.push({
            x: positions[i][0],
            y: positions[i][1],
            radius: 15,
            type: types[Math.floor(Math.random() * types.length)],
            collected: false,
            glowPhase: Math.random() * Math.PI * 2,
            rotation: Math.random() * Math.PI * 2
        });
    }
    
    return treasures;
}

// Create enemies - place them around the visible area
function createEnemies() {
    const enemies = [];
    const types = ['jellyfish', 'predator'];
    const positions = [
        [700, 100], [200, 400], [900, 300], [400, 650], [1000, 550]
    ];
    
    for (let i = 0; i < CONFIG.enemyCount; i++) {
        enemies.push({
            x: positions[i][0],
            y: positions[i][1],
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            radius: 18,
            type: types[Math.floor(Math.random() * types.length)],
            phase: Math.random() * Math.PI * 2,
            patrolPoint: {
                x: positions[i][0] + 100,
                y: positions[i][1] + 100
            }
        });
    }
    
    return enemies;
}

// Create bubbles
function createBubbles() {
    const bubbles = [];
    
    for (let i = 0; i < CONFIG.bubbleCount; i++) {
        bubbles.push({
            x: Math.random() * CONFIG.canvasWidth,
            y: Math.random() * CONFIG.canvasHeight,
            radius: 2 + Math.random() * 6,
            speed: 0.5 + Math.random() * 1.5,
            phase: Math.random() * Math.PI * 2
        });
    }
    
    return bubbles;
}

// Initialize game
function initGame() {
    gameState.treasures = createTreasures();
    gameState.enemies = createEnemies();
    gameState.bubbles = createBubbles();
    gameState.collectedTreasures = 0;
    gameState.oxygen = CONFIG.oxygenMax;
    gameState.player.x = 640;
    gameState.player.y = 360;
    gameState.player.vx = 0;
    gameState.player.vy = 0;
    gameState.fadeAlpha = 1;
    gameState.fadeDirection = -1;
    gameState.screenShake = 0;
    gameState.gameOver = false;
    gameState.gameWon = false;
    gameState.gameEnded = false;
    gameState.startTime = Date.now();
    gameState.lastOxygenDecrease = Date.now();
    gameState.camera.x = 0;
    gameState.camera.y = 0;
    
    treasuresSpan.textContent = '0';
    oxygenBar.style.width = '100%';
    oxygenBar.style.background = 'linear-gradient(90deg, #00ffff, #0088ff)';
    
    // Hide all screens
    winScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    oxygenLowScreen.classList.add('hidden');
    
    startTimer();
}

// Timer function
function startTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    gameState.timerInterval = setInterval(() => {
        if (gameState.gameStarted && !gameState.gameEnded && !gameState.gameOver && !gameState.gameWon) {
            const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            timerSpan.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

// Input handling
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    gameState.keys[key] = true;
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    gameState.keys[key] = false;
});

// Update player
function updatePlayer() {
    if (!gameState.gameStarted || gameState.gameEnded || gameState.gameOver || gameState.gameWon) return;
    
    const player = gameState.player;
    
    let moveX = 0, moveY = 0;
    if (gameState.keys['w'] || gameState.keys['arrowup']) moveY -= 1;
    if (gameState.keys['s'] || gameState.keys['arrowdown']) moveY += 1;
    if (gameState.keys['a'] || gameState.keys['arrowleft']) moveX -= 1;
    if (gameState.keys['d'] || gameState.keys['arrowright']) moveX += 1;
    
    if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.707;
        moveY *= 0.707;
    }
    
    player.vx += moveX * CONFIG.acceleration;
    player.vy += moveY * CONFIG.acceleration;
    
    player.vx *= CONFIG.friction;
    player.vy *= CONFIG.friction;
    
    if (Math.abs(player.vx) < 0.01) player.vx = 0;
    if (Math.abs(player.vy) < 0.01) player.vy = 0;
    
    player.walking = moveX !== 0 || moveY !== 0;
    if (player.walking) {
        player.frame = (player.frame + 0.1) % (Math.PI * 2);
        player.lightAngle += 0.02;
    }
    
    let newX = player.x + player.vx;
    let newY = player.y + player.vy;
    
    // Keep player within canvas bounds
    player.x = Math.max(player.radius + 10, Math.min(CONFIG.canvasWidth - player.radius - 10, newX));
    player.y = Math.max(player.radius + 10, Math.min(CONFIG.canvasHeight - player.radius - 10, newY));
}

// Update enemies with simple AI
function updateEnemies() {
    if (!gameState.gameStarted || gameState.gameEnded || gameState.gameOver || gameState.gameWon) return;
    
    for (let enemy of gameState.enemies) {
        // Simple patrol AI
        const dx = enemy.patrolPoint.x - enemy.x;
        const dy = enemy.patrolPoint.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < 50) {
            // New patrol point within canvas
            enemy.patrolPoint = {
                x: 100 + Math.random() * (CONFIG.canvasWidth - 200),
                y: 100 + Math.random() * (CONFIG.canvasHeight - 200)
            };
        }
        
        // Move toward patrol point
        if (dist > 10) {
            const angle = Math.atan2(dy, dx);
            enemy.vx += Math.cos(angle) * 0.1;
            enemy.vy += Math.sin(angle) * 0.1;
        }
        
        // Limit speed
        const speed = Math.hypot(enemy.vx, enemy.vy);
        if (speed > 2) {
            enemy.vx = (enemy.vx / speed) * 2;
            enemy.vy = (enemy.vy / speed) * 2;
        }
        
        // Update position
        let newX = enemy.x + enemy.vx;
        let newY = enemy.y + enemy.vy;
        
        // Keep enemies within canvas
        enemy.x = Math.max(30, Math.min(CONFIG.canvasWidth - 30, newX));
        enemy.y = Math.max(30, Math.min(CONFIG.canvasHeight - 30, newY));
        
        // Update phase for animation
        enemy.phase += 0.02;
    }
}

// Update bubbles
function updateBubbles() {
    for (let bubble of gameState.bubbles) {
        bubble.y -= bubble.speed;
        bubble.x += Math.sin(bubble.phase) * 0.5;
        bubble.phase += 0.01;
        
        if (bubble.y < -50) {
            bubble.y = CONFIG.canvasHeight + 50;
            bubble.x = Math.random() * CONFIG.canvasWidth;
        }
    }
}

// Update oxygen
function updateOxygen() {
    if (!gameState.gameStarted || gameState.gameEnded || gameState.gameOver || gameState.gameWon) return;
    
    const now = Date.now();
    const deltaTime = (now - gameState.lastOxygenDecrease) / 1000;
    
    if (deltaTime >= 0.1) {
        gameState.oxygen -= CONFIG.oxygenDecreaseRate * deltaTime;
        gameState.lastOxygenDecrease = now;
        
        // Update oxygen bar
        const oxygenPercent = Math.max(0, (gameState.oxygen / CONFIG.oxygenMax) * 100);
        oxygenBar.style.width = `${oxygenPercent}%`;
        
        // Change color based on oxygen level
        if (oxygenPercent < 30) {
            oxygenBar.style.background = 'linear-gradient(90deg, #ff4444, #ff8844)';
            if (Math.random() < 0.01) showMessage('⚠️ Oxygen low! ⚠️');
        } else if (oxygenPercent < 60) {
            oxygenBar.style.background = 'linear-gradient(90deg, #ffff44, #ff8844)';
        } else {
            oxygenBar.style.background = 'linear-gradient(90deg, #00ffff, #0088ff)';
        }
        
        // Check for oxygen depletion
        if (gameState.oxygen <= 0) {
            oxygenDepleted();
        }
    }
}

// Check collisions
function checkCollisions() {
    if (!gameState.gameStarted || gameState.gameEnded || gameState.gameOver || gameState.gameWon) return;
    
    const player = gameState.player;
    
    // Check treasure collisions
    for (let treasure of gameState.treasures) {
        if (!treasure.collected) {
            const dist = Math.hypot(player.x - treasure.x, player.y - treasure.y);
            
            if (dist < player.radius + treasure.radius) {
                treasure.collected = true;
                gameState.collectedTreasures++;
                treasuresSpan.textContent = gameState.collectedTreasures;
                
                gameState.screenShake = 5;
                showMessage(`✨ Treasure collected! (${gameState.collectedTreasures}/${CONFIG.treasureCount})`);
                
                // Create bubble effect
                for (let i = 0; i < 5; i++) {
                    gameState.bubbles.push({
                        x: treasure.x,
                        y: treasure.y,
                        radius: 3 + Math.random() * 5,
                        speed: 1 + Math.random() * 2,
                        phase: Math.random() * Math.PI * 2
                    });
                }
                
                // Check win condition
                if (gameState.collectedTreasures === CONFIG.treasureCount) {
                    winGame();
                }
            }
        }
    }
    
    // Check enemy collisions
    for (let enemy of gameState.enemies) {
        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        
        if (dist < player.radius + enemy.radius) {
            gameOver('enemy');
        }
    }
}

// Win game
function winGame() {
    gameState.gameWon = true;
    gameState.fadeDirection = 1;
    
    clearInterval(gameState.timerInterval);
    
    setTimeout(() => {
        document.getElementById('finalTime').textContent = timerSpan.textContent;
        winScreen.classList.remove('hidden');
    }, 1000);
}

// Game over
function gameOver(reason) {
    if (gameState.gameOver || gameState.gameWon) return;
    
    gameState.gameOver = true;
    gameState.fadeDirection = 1;
    
    clearInterval(gameState.timerInterval);
    
    setTimeout(() => {
        document.getElementById('deathTreasures').textContent = gameState.collectedTreasures;
        document.getElementById('survivalTime').textContent = timerSpan.textContent;
        gameOverScreen.classList.remove('hidden');
    }, 1000);
    
    gameState.screenShake = 15;
}

// Oxygen depleted
function oxygenDepleted() {
    if (gameState.gameOver || gameState.gameWon) return;
    
    gameState.gameOver = true;
    gameState.fadeDirection = 1;
    
    clearInterval(gameState.timerInterval);
    
    setTimeout(() => {
        document.getElementById('oxygenTreasures').textContent = gameState.collectedTreasures;
        oxygenLowScreen.classList.remove('hidden');
    }, 1000);
}

// Show message
function showMessage(text) {
    gameState.messages.current = text;
    gameState.messages.timer = 60;
    messageDisplay.textContent = text;
    messageDisplay.classList.add('visible');
}

// Draw functions
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    
    // Apply screen shake
    let shakeX = 0, shakeY = 0;
    if (gameState.screenShake > 0) {
        shakeX = (Math.random() - 0.5) * gameState.screenShake;
        shakeY = (Math.random() - 0.5) * gameState.screenShake;
        gameState.screenShake *= 0.9;
    }
    
    ctx.save();
    ctx.translate(shakeX, shakeY);
    
    // Draw underwater background
    drawBackground();
    
    // Draw bubbles
    drawBubbles();
    
    // Draw treasures
    drawTreasures();
    
    // Draw enemies
    drawEnemies();
    
    // Draw player with light effect
    drawPlayer();
    
    ctx.restore();
    
    // Draw vignette effect
    drawVignette();
    
    // Update message timer
    if (gameState.messages.timer > 0) {
        gameState.messages.timer--;
    } else {
        messageDisplay.classList.remove('visible');
    }
    
    // Handle fade
    if (gameState.fadeAlpha > 0 || gameState.fadeAlpha < 1) {
        gameState.fadeAlpha += gameState.fadeDirection * 0.02;
        gameState.fadeAlpha = Math.max(0, Math.min(1, gameState.fadeAlpha));
        ctx.fillStyle = `rgba(0, 20, 40, ${gameState.fadeAlpha})`;
        ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    }
}

function drawBackground() {
    // Water gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.canvasHeight);
    gradient.addColorStop(0, '#004466');
    gradient.addColorStop(0.5, '#226688');
    gradient.addColorStop(1, '#44aacc');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    
    // Light rays
    ctx.save();
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(i * 300, 0);
        ctx.lineTo(i * 300 + 200, CONFIG.canvasHeight);
        ctx.lineTo(i * 300 - 200, CONFIG.canvasHeight);
        ctx.fill();
    }
    ctx.restore();
    
    // Seabed
    ctx.fillStyle = '#8b6b4d';
    ctx.fillRect(0, CONFIG.canvasHeight - 50, CONFIG.canvasWidth, 50);
    
    // Plants
    ctx.fillStyle = '#2d5a27';
    for (let i = 0; i < 20; i++) {
        const x = i * 70 + Math.sin(Date.now() * 0.001 + i) * 10;
        ctx.beginPath();
        ctx.moveTo(x, CONFIG.canvasHeight - 50);
        ctx.lineTo(x - 15, CONFIG.canvasHeight - 100);
        ctx.lineTo(x + 15, CONFIG.canvasHeight - 120);
        ctx.lineTo(x, CONFIG.canvasHeight - 50);
        ctx.fill();
    }
    
    // Rocks
    ctx.fillStyle = '#6b4f3a';
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(100 + i * 250, CONFIG.canvasHeight - 30, 40, 20, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawBubbles() {
    ctx.save();
    ctx.shadowColor = '#aaffff';
    ctx.shadowBlur = 10;
    
    for (let bubble of gameState.bubbles) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(bubble.phase) * 0.2})`;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Bubble highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bubble.x - 2, bubble.y - 2, bubble.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

function drawTreasures() {
    for (let treasure of gameState.treasures) {
        if (!treasure.collected) {
            treasure.glowPhase += 0.05;
            treasure.rotation += 0.02;
            
            ctx.save();
            ctx.translate(treasure.x, treasure.y);
            ctx.rotate(treasure.rotation);
            
            // Glow effect
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 20 + Math.sin(treasure.glowPhase) * 10;
            
            // Draw based on type
            switch(treasure.type) {
                case 'pearl':
                    ctx.fillStyle = '#ffaaff';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 10, 12, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#ff88ff';
                    ctx.beginPath();
                    ctx.ellipse(-2, -2, 4, 5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                    
                case 'chest':
                    ctx.fillStyle = '#8b4513';
                    ctx.fillRect(-10, -8, 20, 16);
                    ctx.fillStyle = '#ffd700';
                    ctx.fillRect(-3, -4, 6, 8);
                    ctx.fillStyle = '#654321';
                    ctx.fillRect(-12, -10, 24, 4);
                    break;
                    
                case 'crown':
                    ctx.fillStyle = '#ffd700';
                    ctx.beginPath();
                    ctx.moveTo(-12, -8);
                    ctx.lineTo(-4, -15);
                    ctx.lineTo(0, -8);
                    ctx.lineTo(4, -15);
                    ctx.lineTo(12, -8);
                    ctx.lineTo(8, 0);
                    ctx.lineTo(-8, 0);
                    ctx.closePath();
                    ctx.fill();
                    break;
                    
                case 'ring':
                    ctx.fillStyle = '#c0c0c0';
                    ctx.beginPath();
                    ctx.arc(0, 0, 12, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#ffd700';
                    ctx.beginPath();
                    ctx.arc(0, 0, 8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#ff69b4';
                    ctx.beginPath();
                    ctx.arc(4, -4, 3, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
            
            ctx.restore();
        }
    }
}

function drawEnemies() {
    for (let enemy of gameState.enemies) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        
        const pulse = Math.sin(enemy.phase) * 0.2 + 0.8;
        
        if (enemy.type === 'jellyfish') {
            // Jellyfish body
            ctx.fillStyle = `rgba(255, 100, 200, ${pulse})`;
            ctx.shadowColor = '#ff66aa';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.ellipse(0, 0, 15, 20, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Tentacles
            ctx.fillStyle = 'rgba(255, 150, 200, 0.8)';
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 5, 5);
                ctx.lineTo(i * 7, 30);
                ctx.lineTo(i * 3, 30);
                ctx.closePath();
                ctx.fill();
            }
            
            // Eyes
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(-5, -5, 3, 0, Math.PI * 2);
            ctx.arc(5, -5, 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-6, -6, 1, 0, Math.PI * 2);
            ctx.arc(4, -6, 1, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Predator fish
            ctx.fillStyle = `rgba(100, 100, 255, ${pulse})`;
            ctx.shadowColor = '#4444ff';
            ctx.shadowBlur = 20;
            
            // Body
            ctx.beginPath();
            ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Teeth
            ctx.fillStyle = '#ffffff';
            for (let i = -2; i <= 2; i++) {
                ctx.fillRect(15 + i * 3, -3, 2, 6);
            }
            
            // Eye
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(-8, -4, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-9, -5, 1, 0, Math.PI * 2);
            ctx.fill();
            
            // Fin
            ctx.fillStyle = '#6666ff';
            ctx.beginPath();
            ctx.moveTo(-15, -10);
            ctx.lineTo(-25, 0);
            ctx.lineTo(-15, 10);
            ctx.closePath();
            ctx.fill();
            
            // Dorsal fin
            ctx.beginPath();
            ctx.moveTo(-5, -15);
            ctx.lineTo(0, -25);
            ctx.lineTo(5, -15);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

function drawPlayer() {
    const player = gameState.player;
    
    // Light effect (flashlight/bubble glow)
    const gradient = ctx.createRadialGradient(
        player.x, player.y, 0,
        player.x, player.y, 200
    );
    gradient.addColorStop(0, 'rgba(200, 240, 255, 0.3)');
    gradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 100, 200, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 200, 0, Math.PI * 2);
    ctx.fill();
    
    // Player (diver)
    ctx.save();
    ctx.translate(player.x, player.y);
    
    // Diver body
    ctx.fillStyle = '#3366cc';
    ctx.shadowColor = '#00aaff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.ellipse(0, 0, player.radius, player.radius * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Scuba tank
    ctx.fillStyle = '#666666';
    ctx.fillRect(12, -15, 8, 30);
    ctx.fillRect(10, -18, 12, 6);
    
    // Flippers (animated)
    if (player.walking) {
        const kick = Math.sin(player.frame * 2) * 5;
        ctx.fillStyle = '#2255aa';
        ctx.beginPath();
        ctx.moveTo(-15, 10);
        ctx.lineTo(-25, 15 + kick);
        ctx.lineTo(-15, 20);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(15, 10);
        ctx.lineTo(25, 15 - kick);
        ctx.lineTo(15, 20);
        ctx.fill();
    } else {
        ctx.fillStyle = '#2255aa';
        ctx.beginPath();
        ctx.moveTo(-15, 10);
        ctx.lineTo(-22, 15);
        ctx.lineTo(-15, 20);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(15, 10);
        ctx.lineTo(22, 15);
        ctx.lineTo(15, 20);
        ctx.fill();
    }
    
    // Face mask
    ctx.fillStyle = '#000000';
    ctx.fillRect(-8, -8, 16, 6);
    ctx.fillStyle = '#aaffff';
    ctx.fillRect(-6, -10, 4, 4);
    ctx.fillRect(2, -10, 4, 4);
    
    // Air bubbles from regulator
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 10;
    for (let i = 0; i < 3; i++) {
        const offset = (Date.now() * 0.01 + i * 10) % 30;
        ctx.beginPath();
        ctx.arc(5, -20 - offset, 3 - i * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

function drawVignette() {
    const gradient = ctx.createRadialGradient(
        CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2, 300,
        CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2, 700
    );
    gradient.addColorStop(0, 'rgba(0, 30, 60, 0)');
    gradient.addColorStop(1, 'rgba(0, 30, 60, 0.5)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
}

// Game loop
function gameLoop() {
    if (gameState.gameStarted && !gameState.gameEnded && !gameState.gameOver && !gameState.gameWon) {
        updatePlayer();
        updateEnemies();
        updateBubbles();
        updateOxygen();
        checkCollisions();
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

// Start game function (exposed to global scope)
window.startGame = function() {
    startScreen.classList.add('hidden');
    gameState.gameStarted = true;
    initGame();
};

// Restart game function (exposed to global scope)
window.restartGame = function() {
    // Hide all screens
    winScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    oxygenLowScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    
    gameState.gameStarted = false;
    gameState.gameEnded = false;
    gameState.gameOver = false;
    gameState.gameWon = false;
    
    clearInterval(gameState.timerInterval);
};

// Initialize on page load
window.onload = function() {
    initGame();
    gameLoop();
};
