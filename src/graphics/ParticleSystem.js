export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 500;
    }
    
    initialize() {
        this.particles = [];
    }
    
    createParticle(x, y, type = 'primary', options = {}) {
        if (this.particles.length >= this.maxParticles) return;
        
        const particle = {
            x,
            y,
            vx: options.vx || (Math.random() - 0.5) * 4,
            vy: options.vy || (Math.random() - 0.5) * 4,
            size: options.size || Math.random() * 4 + 2,
            type,
            life: options.life || 1,
            decay: options.decay || 0.02,
            gravity: options.gravity || 0.1,
            color: this.getParticleColor(type),
            trail: []
        };
        
        this.particles.push(particle);
    }
    
    createBurst(x, y, type = 'primary', count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = Math.random() * 5 + 2;
            
            this.createParticle(x, y, type, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 6 + 2,
                life: Math.random() * 0.5 + 0.5,
                gravity: Math.random() * 0.2
            });
        }
    }
    
    createLineClearEffect(y, width) {
        const particleCount = width * 3;
        for (let i = 0; i < particleCount; i++) {
            const x = (i / particleCount) * width * 30;
            this.createParticle(x, y * 30 + 15, 'tertiary', {
                vx: (Math.random() - 0.5) * 8,
                vy: Math.random() * -10 - 5,
                size: Math.random() * 8 + 4,
                life: 1,
                decay: 0.015,
                gravity: 0.3
            });
        }
    }
    
    createTSpinEffect(x, y) {
        const colors = ['primary', 'secondary', 'tertiary'];
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = Math.random() * 8 + 4;
            const type = colors[Math.floor(Math.random() * colors.length)];
            
            this.createParticle(x, y, type, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 6 + 3,
                life: 1,
                decay: 0.01,
                gravity: 0
            });
        }
    }
    
    createComboEffect(x, y, combo) {
        const intensity = Math.min(combo, 10);
        for (let i = 0; i < intensity * 5; i++) {
            this.createParticle(x + Math.random() * 100 - 50, y, 'secondary', {
                vx: 0,
                vy: Math.random * -5 - 2,
                size: Math.random() * 4 + 2,
                life: 1,
                decay: 0.02,
                gravity: -0.1
            });
        }
    }
    
    update(deltaTime) {
        const dt = deltaTime / 16.67; // Normalize to 60fps
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update position
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            
            // Apply gravity
            particle.vy += particle.gravity * dt;
            
            // Add to trail
            if (particle.trail.length < 5) {
                particle.trail.push({ x: particle.x, y: particle.y, life: particle.life });
            } else {
                particle.trail.shift();
                particle.trail.push({ x: particle.x, y: particle.y, life: particle.life });
            }
            
            // Decay
            particle.life -= particle.decay * dt;
            
            // Remove dead particles
            if (particle.life <= 0 || particle.y > 700) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    render(ctx) {
        ctx.save();
        
        this.particles.forEach(particle => {
            // Render trail
            if (particle.trail.length > 1) {
                ctx.beginPath();
                particle.trail.forEach((point, index) => {
                    ctx.globalAlpha = point.life * 0.3 * (index / particle.trail.length);
                    ctx.fillStyle = particle.color;
                    ctx.fillRect(
                        point.x - particle.size * 0.5,
                        point.y - particle.size * 0.5,
                        particle.size,
                        particle.size
                    );
                });
            }
            
            // Render particle
            ctx.globalAlpha = particle.life;
            ctx.fillStyle = particle.color;
            ctx.shadowBlur = particle.size * 2;
            ctx.shadowColor = particle.color;
            
            // Different shapes for different types
            if (particle.type === 'primary') {
                ctx.fillRect(
                    particle.x - particle.size / 2,
                    particle.y - particle.size / 2,
                    particle.size,
                    particle.size
                );
            } else if (particle.type === 'secondary') {
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Star shape for tertiary
                this.drawStar(ctx, particle.x, particle.y, particle.size / 2);
            }
        });
        
        ctx.restore();
    }
    
    drawStar(ctx, x, y, radius) {
        const spikes = 5;
        const outerRadius = radius;
        const innerRadius = radius / 2;
        
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const angle = (i * Math.PI) / spikes - Math.PI / 2;
            const r = i % 2 === 0 ? outerRadius : innerRadius;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        ctx.fill();
    }
    
    getParticleColor(type) {
        const colors = {
            primary: '#00ffcc',
            secondary: '#ff00ff',
            tertiary: '#ffff00',
            danger: '#ff0000',
            success: '#00ff00',
            info: '#0099ff'
        };
        
        return colors[type] || colors.primary;
    }
    
    clear() {
        this.particles = [];
    }
}