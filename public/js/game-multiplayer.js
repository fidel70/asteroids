// Utils
function distanceBetween(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function checkCircleCollision(x1, y1, r1, x2, y2, r2) {
    return distanceBetween(x1, y1, x2, y2) < r1 + r2;
}

// Game Functions
function createExplosion(x, y, color, amount) {
    for (let i = 0; i < amount; i++) {
        particles.push(new Particle(x, y, color, 'explosion'));
    }
}

function createBullet(bulletData = null) {
    if (!ship.alive) return;
    
    const bullet = {
        id: crypto.randomUUID(),
        x: bulletData ? bulletData.x : ship.x,
        y: bulletData ? bulletData.y : ship.y,
        speedX: bulletData ? bulletData.speedX : Math.sin(ship.angle) * CONFIG.bulletSpeed,
        speedY: bulletData ? bulletData.speedY : -Math.cos(ship.angle) * CONFIG.bulletSpeed,
        lifetime: CONFIG.bulletLifetime,
        playerId: bulletData ? bulletData.playerId : networkManager.playerId,
        damage: CONFIG.bulletDamage
    };

    bullets.push(bullet);
    
    if (!bulletData) {
        networkManager.sendShoot(bullet);
        playSound('shoot');
    }
}

function initAsteroids() {
    asteroids = [];
    for (let i = 0; i < 4; i++) {
        let asteroid;
        do {
            asteroid = new Asteroid();
        } while (distanceBetween(ship.x, ship.y, asteroid.x, asteroid.y) < CONFIG.minAsteroidDistance);
        asteroids.push(asteroid);
    }
}

function updateGameState(data) {
    gameState.running = data.running;
    
    // Update other players
    data.players.forEach(playerData => {
        if (playerData.id !== ship.playerId) {
            let otherShip = gameState.players.get(playerData.id);
            if (!otherShip) {
                otherShip = new Ship(playerData.id);
                gameState.players.set(playerData.id, otherShip);
            }
            otherShip.syncFromServer(playerData);
        }
    });

    // Remove disconnected players
    Array.from(gameState.players.keys()).forEach(id => {
        if (!data.players.find(p => p.id === id)) {
            gameState.players.delete(id);
        }
    });
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.speedX;
        bullet.y += bullet.speedY;
        
        // Screen wrapping
        if (bullet.x > canvas.width) bullet.x = 0;
        if (bullet.x < 0) bullet.x = canvas.width;
        if (bullet.y > canvas.height) bullet.y = 0;
        if (bullet.y < 0) bullet.y = canvas.height;
        
        bullet.lifetime--;
        
        if (bullet.lifetime <= 0) {
            bullets.splice(i, 1);
            continue;
        }

        // Check collisions with asteroids
        for (let j = asteroids.length - 1; j >= 0; j--) {
            const asteroid = asteroids[j];
            if (checkCircleCollision(bullet.x, bullet.y, CONFIG.bulletSize, asteroid.x, asteroid.y, asteroid.size)) {
                if (asteroid.damage(bullet.damage, bullet.playerId)) {
                    createExplosion(asteroid.x, asteroid.y, "#ffaa00", 20);
                    networkManager.sendAsteroidDestroyed(asteroid.id, bullet.playerId);
                    asteroids.splice(j, 1);
                    gameState.asteroidsLeft--;
                }
                bullets.splice(i, 1);
                break;
            }
        }

        // Check collisions with ships
        if (ship.alive && !ship.isInvulnerable && bullet.playerId !== ship.playerId) {
            if (checkCircleCollision(bullet.x, bullet.y, CONFIG.bulletSize, ship.x, ship.y, ship.size)) {
                handleShipHit(ship, bullet.playerId);
                bullets.splice(i, 1);
                continue;
            }
        }

        gameState.players.forEach(otherShip => {
            if (otherShip.alive && !otherShip.isInvulnerable && bullet.playerId !== otherShip.playerId) {
                if (checkCircleCollision(bullet.x, bullet.y, CONFIG.bulletSize, otherShip.x, otherShip.y, otherShip.size)) {
                    handleShipHit(otherShip, bullet.playerId);
                    bullets.splice(i, 1);
                }
            }
        });
    }
}

function handleShipHit(targetShip, shooterId) {
    targetShip.lives--;
    createExplosion(targetShip.x, targetShip.y, "#ff0000", 15);
    playSound('explosion');

    if (targetShip.lives <= 0) {
        targetShip.alive = false;
        if (shooterId) {
            const shooter = shooterId === ship.playerId ? ship : gameState.players.get(shooterId);
            if (shooter) {
                shooter.score += CONFIG.playerKillScore;
            }
        }
        setTimeout(() => {
            targetShip.respawn();
        }, CONFIG.respawnTime);
    } else {
        targetShip.setInvulnerable();
    }

    networkManager.sendShipState(targetShip.getState());
}

function drawBullets() {
    ctx.fillStyle = "#ffffff";
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, CONFIG.bulletSize, 0, Math.PI * 2);
        ctx.fill();
    });
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(particle => particle.draw());
}

function update() {
    if (!gameState.waitingForPlayers && gameState.running) {
        ship.update();
        if (ship.isLocalPlayer && networkManager.isConnected) {
            networkManager.sendUpdate(ship.getState());
        }

        gameState.players.forEach(player => player.update());
        updateBullets();
        asteroids.forEach(asteroid => asteroid.update());
        checkCollisions();
    }
    updateParticles();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameState.waitingForPlayers) {
        drawWaitingScreen();
        return;
    }

    ship.draw();
    gameState.players.forEach(player => player.draw());
    drawBullets();
    asteroids.forEach(asteroid => asteroid.draw());
    drawParticles();
    drawHUD();
}

function drawWaitingScreen() {
    ctx.fillStyle = "#ffffff";
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Esperando jugadores...", canvas.width/2, canvas.height/2);
}

function drawHUD() {
    ctx.font = "20px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText(`Vidas: ${ship.lives}`, 20, 30);
    ctx.fillText(`Puntuación: ${ship.score}`, 20, 60);
    ctx.fillText(`Asteroides: ${gameState.asteroidsLeft}`, 20, 90);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function endGame(message) {
    gameState.running = false;
    gameMessage.textContent = message;
    gameOverlay.style.display = 'block';
}

function restartGame() {
    networkManager.requestRestart();
    
    bullets = [];
    particles = [];
    gameState.running = true;
    gameState.asteroidsLeft = 4;
    
    ship.respawn();
    initAsteroids();
    
    gameOverlay.style.display = 'none';
}

function initGame() {
    if (gameInitialized) return;
    gameInitialized = true;
    
    networkManager = new NetworkManager();
    initSounds();
    
    requestAnimationFrame(gameLoop);
}

// Event Listeners
document.addEventListener("keydown", (event) => {
    if (!gameState.running || !ship.isLocalPlayer) return;
    
    switch(event.code) {
        case 'ArrowLeft':
            ship.angle -= ship.rotationSpeed;
            break;
        case 'ArrowUp':
            ship.thrust = true;
            break;
        case 'ArrowRight':
            ship.angle += ship.rotationSpeed;
            break;
        case 'Space':
            createBullet();
            break;
    }
});

document.addEventListener("keyup", (event) => {
    if (!ship.isLocalPlayer) return;
    
    if (event.code === 'ArrowUp') {
        ship.thrust = false;
    }
});

restartButton.addEventListener("click", () => {
    if (networkManager.isConnected) {
        restartGame();
    }
});

window.addEventListener('load', initGame);