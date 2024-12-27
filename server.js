const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Servir archivos estáticos
app.use(express.static('public'));

// Estado del juego
let players = new Map();
let gameState = {
    asteroids: [],
    running: false
};

// Manejo de conexiones Socket.IO
io.on('connection', (socket) => {
    console.log('Jugador conectado:', socket.id);

    // Si ya hay 2 jugadores, rechazar conexión
    if (players.size >= 2) {
        socket.emit('game_full');
        socket.disconnect(true);
        return;
    }

    // Asignar rol de jugador
    const playerData = {
        id: socket.id,
        x: Math.random() * 800,
        y: Math.random() * 600,
        score: 0
    };
    
    players.set(socket.id, playerData);

    // Informar al nuevo jugador y a los existentes
    socket.emit('player_assigned', {
        players: Array.from(players.values())
    });

    socket.broadcast.emit('player_joined', playerData);

    // Si hay 2 jugadores, iniciar el juego
    if (players.size === 2) {
        gameState.running = true;
        io.emit('game_state_update', {
            running: true,
            players: Array.from(players.values())
        });
    }

    // Manejo de eventos del juego
    socket.on('player_update', (data) => {
        const player = players.get(socket.id);
        if (player) {
            Object.assign(player, data);
            socket.broadcast.emit('player_update', data);
        }
    });

    socket.on('player_shoot', (bulletData) => {
        socket.broadcast.emit('player_shoot', {
            ...bulletData,
            playerId: socket.id
        });
    });

    socket.on('asteroid_destroyed', (data) => {
        const player = players.get(socket.id);
        if (player) {
            player.score += 100;
            io.emit('asteroid_destroyed', {
                asteroidId: data.asteroidId,
                playerId: socket.id,
                score: player.score
            });
        }
    });

    socket.on('ship_destroyed', (data) => {
        io.emit('ship_destroyed', {
            playerId: socket.id
        });
    });

    socket.on('request_restart', () => {
        const player = players.get(socket.id);
        if (player) {
            player.score = 0;
            player.ready = true;

            // Si todos los jugadores están listos, reiniciar
            if (Array.from(players.values()).every(p => p.ready)) {
                gameState.running = true;
                io.emit('game_restart');
                // Resetear estado ready
                players.forEach(p => p.ready = false);
            }
        }
    });

    // Manejo de desconexión
    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        players.delete(socket.id);
        io.emit('player_disconnected', socket.id);
        
        if (players.size < 2) {
            gameState.running = false;
            io.emit('game_state_update', {
                running: false,
                players: Array.from(players.values())
            });
        }
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});

// Manejo de errores
process.on('uncaughtException', (err) => {
    console.error('Error no manejado:', err);
});

// Limpieza al cerrar
process.on('SIGINT', () => {
    io.close(() => {
        console.log('Servidor Socket.IO cerrado');
        process.exit(0);
    });
});