class NetworkManager {
    constructor() {
        this.socket = io();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.socket.on('gameState', this.handleGameState.bind(this));
        this.socket.on('playerJoined', this.handlePlayerJoined.bind(this));
        this.socket.on('playerLeft', this.handlePlayerLeft.bind(this));
    }

    handleGameState(gameState) {
        // Actualizar estado del juego
    }

    handlePlayerJoined(player) {
        console.log('Nuevo jugador:', player);
    }

    handlePlayerLeft(playerId) {
        console.log('Jugador desconectado:', playerId);
    }

    sendUpdate(playerState) {
        this.socket.emit('playerUpdate', playerState);
    }
}