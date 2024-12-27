// Variables globales existentes
let networkManager;

// Funciones de utilidad
function distanceBetween(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function checkCircleCollision(x1, y1, r1, x2, y2, r2) {
    return distanceBetween(x1, y1, x2, y2) < r1 + r2;
}

function createBullet(bulletData = null) {
    if (!ship.alive) return;
    
    const bullet = {
        x: bulletData ? bulletData.x : ship.x,
        y: bulletData ? bulletData.y : ship.y,
        speedX: bulletData ? bulletData.speedX : Math.sin(ship.angle) * CONFIG.bulletSpeed,
        speedY: bulletData ? bulletData.speedY : -Math.cos(ship.angle) * CONFIG.bulletSpeed,
        lifetime: CONFIG.bulletLifetime,
        playerId: bulletData ? bulletData.playerId : networkManager.playerId
    };

    bullets.push(bullet);
    
    if (!bulletData) {
        // Solo enviar al servidor si es un disparo local
        networkManager.sendShoot(bullet);
        playSound('shoot');
    }
}

// Función update modificada
function update() {
    if (gameState.running) {
        // Actualizar nave local
        ship.update();
        if (ship.isLocalPlayer && networkManager.isConnected) {
            networkManager.sendShipUpdate(ship.getState());
        }

        // Actualizar nave del oponente si existe
        if (networkManager.opponent) {
            networkManager.opponent.update();
        }

        updateBullets();
        asteroids.forEach(asteroid => asteroid.update());
        checkCollisions();

        // Sincronizar asteroides periódicamente
        if (ship.isLocalPlayer && networkManager.isConnected) {
            networkManager.syncAsteroids(asteroids.map(a => a.getState()));
        }
    }
    updateParticles();
}

// Función draw modificada
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar nave local
    ship.draw();
    
    // Dibujar nave del oponente si existe
    if (networkManager.opponent) {
        networkManager.opponent.draw();
    }
    
    drawBullets();
    asteroids.forEach(asteroid => asteroid.draw());
    drawParticles();
}

// Función de finalización de juego modificada
function endGame(message) {
    gameState.running = false;
    gameMessage.textContent = message;
    gameOverlay.style.display = 'block';
}

// Función de reinicio modificada
function restartGame() {
    // Solicitar reinicio al servidor
    networkManager.requestRestart();
    
    // Reiniciar estado local
    bullets = [];
    particles = [];
    gameState.running = true;
    gameState.asteroidsLeft = 4;
    
    // El ship ya existe, solo reposicionar
    ship.respawn();
    
    initAsteroids();
    
    scoreDiv.textContent = `Asteroides restantes: ${gameState.asteroidsLeft}`;
    gameOverlay.style.display = 'none';
}

// Función de inicio modificada
function initGame() {
    if (gameInitialized) return;
    gameInitialized = true;
    
    // Inicializar networkManager antes que otros sistemas
    networkManager = new NetworkManager();
    
    initSounds();
    // La nave se creará cuando se asigne el número de jugador en NetworkManager
    
    requestAnimationFrame(gameLoop);
}

// Event listeners modificados
document.addEventListener("keydown", function(event) {
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

document.addEventListener("keyup", function(event) {
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

// Iniciar el juego cuando todo esté cargado
window.addEventListener('load', initGame);