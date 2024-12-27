class NetworkManager {
    constructor() {
        // Conexión Socket.IO
        this.socket = io('http://localhost:3000');
        this.playerId = null;
        this.isConnected = false;
        this.lastUpdateTime = Date.now();

        // Configurar eventos de red
        this.setupNetworkEvents();
    }

    setupNetworkEvents() {
        // Conexión y configuración inicial
        this.socket.on('connect', () => {
            console.log('Conectado al servidor');
            this.isConnected = true;
            this.playerId = this.socket.id;
        });

        this.socket.on('disconnect', () => {
            console.log('Desconectado del servidor');
            this.isConnected = false;
        });

        this.socket.on('player_assigned', (data) => {
            localPlayerId = this.socket.id;
            console.log('Asignado como jugador:', localPlayerId);
            initMultiplayerGame(data);
        });

        // Eventos de juego
        this.socket.on('player_joined', (playerData) => {
            if (playerData.id !== localPlayerId) {
                console.log('Nuevo jugador unido:', playerData.id);
                const newShip = new Ship(playerData.x, playerData.y);
                otherPlayers.set(playerData.id, newShip);
            }
        });

        this.socket.on('player_update', (playerData) => {
            if (playerData.id !== localPlayerId) {
                let otherShip = otherPlayers.get(playerData.id);
                if (otherShip) {
                    otherShip.x = playerData.x;
                    otherShip.y = playerData.y;
                    otherShip.angle = playerData.angle;
                    otherShip.thrust = playerData.thrust;
                    otherShip.speedX = playerData.speedX;
                    otherShip.speedY = playerData.speedY;
                }
            }
        });

        this.socket.on('player_shoot', (bulletData) => {
            if (bulletData.playerId !== localPlayerId) {
                createRemoteBullet(bulletData);
            }
        });

        this.socket.on('player_disconnected', (playerId) => {
            console.log('Jugador desconectado:', playerId);
            removePlayer(playerId);
        });

        this.socket.on('asteroid_destroyed', (data) => {
            const asteroid = asteroids.find(a => a.id === data.asteroidId);
            if (asteroid) {
                createExplosion(asteroid.x, asteroid.y, "#ffaa00", 20);
                asteroids = asteroids.filter(a => a.id !== data.asteroidId);
                gameState.asteroidsLeft--;
                
                // Actualizar puntuación
                if (!gameScores.has(data.playerId)) {
                    gameScores.set(data.playerId, 0);
                }
                gameScores.set(data.playerId, gameScores.get(data.playerId) + 100);
                
                scoreDiv.textContent = `Asteroides restantes: ${gameState.asteroidsLeft}`;
            }
        });

        this.socket.on('ship_destroyed', (data) => {
            if (data.playerId !== localPlayerId) {
                const otherShip = otherPlayers.get(data.playerId);
                if (otherShip) {
                    handleShipCollision(otherShip);
                }
            }
        });

        this.socket.on('game_state_update', (data) => {
            updateGameState(data);
        });

        this.socket.on('game_restart', () => {
            console.log('Reiniciando juego...');
            waitingForPlayers = false;
            restartGame();
        });
    }

    // Métodos para enviar datos al servidor
    sendUpdate(shipData) {
        if (!this.isConnected) return;
        
        const now = Date.now();
        if (now - this.lastUpdateTime > 16) { // ~60 FPS
            this.socket.emit('player_update', {
                id: this.playerId,
                ...shipData
            });
            this.lastUpdateTime = now;
        }
    }

    sendShoot(bulletData) {
        if (!this.isConnected) return;
        this.socket.emit('player_shoot', {
            ...bulletData,
            playerId: this.playerId
        });
    }

    sendAsteroidDestroyed(asteroidId) {
        if (!this.isConnected) return;
        this.socket.emit('asteroid_destroyed', {
            asteroidId,
            playerId: this.playerId
        });
    }

    sendShipDestroyed() {
        if (!this.isConnected) return;
        this.socket.emit('ship_destroyed', {
            playerId: this.playerId
        });
    }

    requestRestart() {
        if (!this.isConnected) return;
        this.socket.emit('request_restart');
    }
}