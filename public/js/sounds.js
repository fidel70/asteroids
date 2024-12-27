// sounds.js
const SOUNDS = {
    shoot: new Audio('sounds/shoot.mp3'),
    explosion: new Audio('sounds/explosion.mp3'),
    thrust: new Audio('sounds/thrust.mp3'),
    gameOver: new Audio('sounds/gameover.mp3'),
    victory: new Audio('sounds/gameover.mp3')
};

// Control de sonido
let isMuted = false;
let volume = 0.5;

function initSounds() {
    // Precargamos los sonidos y configuramos volumen inicial
    Object.values(SOUNDS).forEach(sound => {
        sound.volume = volume;
        // Algunas versiones móviles requieren interacción del usuario
        sound.load();
    });
}

function setVolume(value) {
    volume = value;
    Object.values(SOUNDS).forEach(sound => {
        sound.volume = value;
    });
}

function toggleMute() {
    isMuted = !isMuted;
    Object.values(SOUNDS).forEach(sound => {
        sound.muted = isMuted;
    });
    document.getElementById('muteButton').textContent = isMuted ? '🔇' : '🔊';
}

function playSound(soundName) {
    if (SOUNDS[soundName]) {
        // Creamos una nueva instancia para sonidos repetitivos
        if (soundName === 'shoot' || soundName === 'explosion') {
            const soundClone = SOUNDS[soundName].cloneNode();
            soundClone.volume = volume;
            soundClone.play().catch(error => console.log("Error reproduciendo sonido:", error));
            // Limpiamos la memoria después de reproducir
            soundClone.onended = () => soundClone.remove();
        } else {
            SOUNDS[soundName].currentTime = 0;
            SOUNDS[soundName].play().catch(error => console.log("Error reproduciendo sonido:", error));
        }
    }
}