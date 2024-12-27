// Clase Ship modificada para multijugador
class Ship {
    constructor(playerId, color = "#ffffff") {
        // Propiedades básicas existentes
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.size = CONFIG.shipSize;
        this.angle = -Math.PI / 2;
        this.rotationSpeed = CONFIG.shipRotationSpeed;
        this.acceleration = CONFIG.shipAcceleration;
        this.friction = CONFIG.shipFriction;
        this.thrust = false;
        this.speedX = 0;
        this.speedY = 0;
        this.alive = true;

        // Nuevas propiedades para multijugador
        this.playerId = playerId;           // ID único del jugador
        this.color = color;                 // Color distintivo de la nave
        this.lives = 3;                     // Número de vidas
        this.score = 0;                     // Puntuación del jugador
        this.isInvulnerable = false;        // Estado de invulnerabilidad
        this.invulnerableTime = 3000;       // Tiempo de invulnerabilidad en ms
        this.lastUpdate = Date.now();       // Último timestamp de actualización
        this.isLocalPlayer = false;         // Indica si es el jugador local
    }

    // Método para reiniciar la nave cuando muere
    respawn() {
        this.x = this.findSafeSpawnPosition().x;
        this.y = this.findSafeSpawnPosition().y;
        this.speedX = 0;
        this.speedY = 0;
        this.angle = -Math.PI / 2;
        this.alive = true;
        this.setInvulnerable();
    }

    // Activar invulnerabilidad temporal
    setInvulnerable() {
        this.isInvulnerable = true;
        setTimeout(() => {
            this.isInvulnerable = false;
        }, this.invulnerableTime);
    }

    // Encontrar posición segura para reaparecer
    findSafeSpawnPosition() {
        let position;
        let isSafe;
        do {
            position = {
                x: Math.random() * (canvas.width - 100) + 50,
                y: Math.random() * (canvas.height - 100) + 50
            };
            isSafe = this.checkPositionSafety(position);
        } while (!isSafe);
        return position;
    }

    // Verificar si una posición es segura
    checkPositionSafety(position) {
        const safeDistance = 100;
        // Verificar distancia con asteroides
        for (let asteroid of asteroids) {
            if (distanceBetween(position.x, position.y, asteroid.x, asteroid.y) < safeDistance) {
                return false;
            }
        }
        // Verificar distancia con otros jugadores
        for (let [_, otherShip] of otherPlayers) {
            if (distanceBetween(position.x, position.y, otherShip.x, otherShip.y) < safeDistance) {
                return false;
            }
        }
        return true;
    }

    // Método modificado para dibujar la nave
    draw() {
        if (!this.alive) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Efecto visual de invulnerabilidad
        if (this.isInvulnerable) {
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3;
        }

        // Dibujar la nave con su color distintivo
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size, this.size);
        ctx.lineTo(-this.size, this.size);
        ctx.closePath();
        ctx.strokeStyle = this.color;
        ctx.stroke();

        // Si está acelerando, dibujar el fuego del propulsor
        if (this.thrust) {
            this.drawThrust();
        }

        ctx.restore();
    }

    // Nuevo método para dibujar el fuego del propulsor
    drawThrust() {
        ctx.beginPath();
        ctx.moveTo(-this.size / 2, this.size);
        ctx.lineTo(0, this.size + 10 + Math.random() * 5);
        ctx.lineTo(this.size / 2, this.size);
        ctx.strokeStyle = "#ff4400";
        ctx.stroke();
    }

    // Método modificado para actualizar la nave
    update() {
        if (!this.alive) return;
        
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastUpdate) / 1000; // Convertir a segundos
        this.lastUpdate = currentTime;

        // Aplicar fricción
        this.speedX *= this.friction;
        this.speedY *= this.friction;

        // Actualizar velocidad basada en el empuje
        if (this.thrust) {
            this.speedX += Math.sin(this.angle) * this.acceleration * deltaTime;
            this.speedY -= Math.cos(this.angle) * this.acceleration * deltaTime;
        }

        // Actualizar posición
        this.x += this.speedX;
        this.y += this.speedY;

        // Wrap around screen edges
        if (this.x > canvas.width + this.size) this.x = -this.size;
        if (this.x < -this.size) this.x = canvas.width + this.size;
        if (this.y > canvas.height + this.size) this.y = -this.size;
        if (this.y < -this.size) this.y = canvas.height + this.size;
    }

    // Nuevo método para sincronizar estado desde el servidor
    syncFromServer(data) {
        if (!this.isLocalPlayer) {
            this.x = data.x;
            this.y = data.y;
            this.angle = data.angle;
            this.thrust = data.thrust;
            this.speedX = data.speedX;
            this.speedY = data.speedY;
            this.score = data.score;
            this.lives = data.lives;
            this.alive = data.alive;
            this.isInvulnerable = data.isInvulnerable;
        }
    }

    // Nuevo método para obtener estado para enviar al servidor
    getState() {
        return {
            playerId: this.playerId,
            x: this.x,
            y: this.y,
            angle: this.angle,
            thrust: this.thrust,
            speedX: this.speedX,
            speedY: this.speedY,
            score: this.score,
            lives: this.lives,
            alive: this.alive,
            isInvulnerable: this.isInvulnerable
        };
    }
}
class Asteroid {
    constructor(x, y, id = crypto.randomUUID()) {
        this.id = id;                   // ID único para tracking
        this.x = x || Math.random() * canvas.width;
        this.y = y || Math.random() * canvas.height;
        this.size = Math.random() * (CONFIG.asteroidMaxSize - CONFIG.asteroidMinSize) + CONFIG.asteroidMinSize;
        this.angle = Math.random() * Math.PI * 2;
        this.speedX = Math.cos(this.angle) * CONFIG.asteroidSpeed;
        this.speedY = Math.sin(this.angle) * CONFIG.asteroidSpeed;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;  // Velocidad de rotación
        this.rotation = 0;                                   // Ángulo actual de rotación
        this.health = 100;                                   // Vida del asteroide
        this.lastUpdate = Date.now();                        // Timestamp última actualización
        this.destroyedBy = null;                            // ID del jugador que lo destruyó
        this.points = this.generatePoints();
        this.originalPoints = [...this.points];             // Guardar puntos originales
    }

    update() {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        // Actualizar posición
        this.x += this.speedX * deltaTime;
        this.y += this.speedY * deltaTime;

        // Actualizar rotación
        this.rotation += this.rotationSpeed;
        this.updatePointsRotation();

        // Wrap around pantalla
        if (this.x > canvas.width + this.size) this.x = -this.size;
        if (this.x < -this.size) this.x = canvas.width + this.size;
        if (this.y > canvas.height + this.size) this.y = -this.size;
        if (this.y < -this.size) this.y = canvas.height + this.size;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Dibujar el asteroide
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        // Dibujar barra de vida si está dañado
        if (this.health < 100) {
            this.drawHealthBar();
        }

        ctx.restore();
    }

    drawHealthBar() {
        const barWidth = this.size * 2;
        const barHeight = 4;
        const barY = this.size + 10;
        
        // Fondo de la barra
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(-barWidth/2, barY, barWidth, barHeight);
        
        // Barra de vida actual
        ctx.fillStyle = "#00FF00";
        ctx.fillRect(-barWidth/2, barY, barWidth * (this.health/100), barHeight);
    }

    generatePoints() {
        const points = [];
        const numPoints = 8;
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const variance = Math.random() * 0.4 + 0.8;
            points.push({
                x: Math.cos(angle) * this.size * variance,
                y: Math.sin(angle) * this.size * variance
            });
        }
        return points;
    }

    updatePointsRotation() {
        for (let i = 0; i < this.points.length; i++) {
            const originalX = this.originalPoints[i].x;
            const originalY = this.originalPoints[i].y;
            
            this.points[i] = {
                x: originalX * Math.cos(this.rotation) - originalY * Math.sin(this.rotation),
                y: originalX * Math.sin(this.rotation) + originalY * Math.cos(this.rotation)
            };
        }
    }

    damage(amount, playerId) {
        this.health -= amount;
        if (this.health <= 0 && !this.destroyedBy) {
            this.destroyedBy = playerId;
            return true; // Asteroide destruido
        }
        return false;
    }

    // Método para sincronizar estado desde el servidor
    syncFromServer(data) {
        this.x = data.x;
        this.y = data.y;
        this.speedX = data.speedX;
        this.speedY = data.speedY;
        this.health = data.health;
        this.rotation = data.rotation;
        this.destroyedBy = data.destroyedBy;
    }

    // Método para obtener estado para el servidor
    getState() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            speedX: this.speedX,
            speedY: this.speedY,
            health: this.health,
            rotation: this.rotation,
            destroyedBy: this.destroyedBy
        };
    }
}
// Clase Particle
class Particle {
    constructor(x, y, color, type = 'explosion', playerId = null) {
        this.id = crypto.randomUUID();      // ID único
        this.x = x;
        this.y = y;
        this.color = color || "#ffffff";
        this.type = type;                   // explosion, thrust, impact
        this.playerId = playerId;           // ID del jugador que la generó
        this.size = Math.random() * 3 + 1;
        
        // Velocidad y dirección
        const angle = Math.random() * Math.PI * 2;
        const speed = this.getInitialSpeed(type);
        this.speedX = Math.cos(angle) * speed;
        this.speedY = Math.sin(angle) * speed;
        
        // Propiedades de vida y física
        this.life = 1.0;
        this.decay = this.getDecayRate(type);
        this.lastUpdate = Date.now();
        
        // Propiedades de animación
        this.alpha = 1.0;
        this.scale = 1.0;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
    }

    getInitialSpeed(type) {
        switch(type) {
            case 'explosion': return Math.random() * 5 + 2;
            case 'thrust': return Math.random() * 2 + 1;
            case 'impact': return Math.random() * 3 + 1;
            default: return Math.random() * 5 + 2;
        }
    }

    getDecayRate(type) {
        switch(type) {
            case 'explosion': return Math.random() * 0.02 + 0.02;
            case 'thrust': return Math.random() * 0.1 + 0.05;
            case 'impact': return Math.random() * 0.05 + 0.03;
            default: return Math.random() * 0.02 + 0.02;
        }
    }

    update() {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        // Actualizar posición
        this.x += this.speedX * deltaTime;
        this.y += this.speedY * deltaTime;

        // Actualizar rotación
        this.rotation += this.rotationSpeed * deltaTime;

        // Actualizar propiedades según el tipo
        switch(this.type) {
            case 'explosion':
                this.scale -= 0.01;
                this.alpha = this.life;
                break;
            case 'thrust':
                this.scale -= 0.03;
                this.alpha = this.life * 0.7;
                break;
            case 'impact':
                this.scale += 0.02;
                this.alpha = this.life * 0.5;
                break;
        }

        // Reducir vida
        this.life -= this.decay * deltaTime;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = this.alpha;
        
        switch(this.type) {
            case 'explosion':
                this.drawExplosion();
                break;
            case 'thrust':
                this.drawThrust();
                break;
            case 'impact':
                this.drawImpact();
                break;
            default:
                this.drawDefault();
        }
        
        ctx.restore();
    }

    drawExplosion() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    drawThrust() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(-this.size, -this.size);
        ctx.lineTo(0, this.size);
        ctx.lineTo(this.size, -this.size);
        ctx.closePath();
        ctx.fill();
    }

    drawImpact() {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawDefault() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Método para sincronizar con el servidor
    syncFromServer(data) {
        this.x = data.x;
        this.y = data.y;
        this.life = data.life;
        this.scale = data.scale;
        this.alpha = data.alpha;
        this.rotation = data.rotation;
    }

    // Método para obtener estado para el servidor
    getState() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            type: this.type,
            life: this.life,
            scale: this.scale,
            alpha: this.alpha,
            rotation: this.rotation,
            playerId: this.playerId
        };
    }
}