const CONFIG = {
    // Game mechanics
    bulletSpeed: 7,
    bulletSize: 2,
    bulletLifetime: 60,
    bulletDamage: 25,
    
    // Ship
    shipSize: 20,
    shipRotationSpeed: 0.1,
    shipAcceleration: 0.1,
    shipFriction: 0.99,
    initialLives: 3,
    respawnTime: 3000,
    invulnerabilityTime: 3000,
    
    // Asteroids
    asteroidMinSize: 25,
    asteroidMaxSize: 40,
    asteroidSpeed: 2,
    minAsteroidDistance: 150,
    asteroidBaseScore: 100,
    
    // Multiplayer
    maxPlayers: 2,
    safeSpawnDistance: 100,
    playerKillScore: 500,
    updateRate: 16,
    interpolationDelay: 100
};

// Game state
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("Canvas no soportado");

const scoreDiv = document.getElementById("score");
const gameOverlay = document.getElementById("gameOverlay");
const gameMessage = document.getElementById("gameMessage");
const restartButton = document.getElementById("restartButton");

let gameState = {
    running: false,
    asteroidsLeft: 4,
    players: new Map(),
    waitingForPlayers: true
};

let ship;
let asteroids = [];
let bullets = [];
let particles = [];
let gameInitialized = false;