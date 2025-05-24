import { Game } from './game/Game.js';
import { SoundManager } from './audio/SoundManager.js';
import { ParticleSystem } from './graphics/ParticleSystem.js';
import { MenuManager } from './ui/MenuManager.js';
import { SettingsManager } from './managers/SettingsManager.js';
import { NetworkManager } from './network/NetworkManager.js';
import { LeaderboardManager } from './managers/LeaderboardManager.js';
import { InputManager } from './input/InputManager.js';
import { Renderer } from './graphics/Renderer.js';

export class TetrisUltimate {
    constructor() {
        this.game = null;
        this.soundManager = new SoundManager();
        this.particleSystem = new ParticleSystem();
        this.menuManager = new MenuManager();
        this.settingsManager = new SettingsManager();
        this.networkManager = new NetworkManager();
        this.leaderboardManager = new LeaderboardManager();
        this.inputManager = new InputManager();
        this.renderer = new Renderer();
        
        this.initialize();
    }
    
    async initialize() {
        try {
            // Initialize all systems
            await this.soundManager.initialize();
            this.particleSystem.initialize();
            this.settingsManager.load();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Hide loading screen
            setTimeout(() => {
                document.getElementById('loading-screen').classList.add('hidden');
                document.getElementById('main-menu').classList.remove('hidden');
                this.soundManager.playMenuMusic();
            }, 2000);
            
            // Create background effects
            this.createBackgroundEffects();
            
        } catch (error) {
            console.error('Failed to initialize Tetris Ultimate:', error);
        }
    }
    
    setupEventListeners() {
        // Menu button clicks
        document.querySelectorAll('.menu-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                const action = e.currentTarget.dataset.action;
                
                if (mode) {
                    this.startGame(mode);
                } else if (action) {
                    this.handleAction(action);
                }
                
                this.soundManager.playSound('menuClick');
            });
        });
        
        // Settings
        document.getElementById('particles-enabled').addEventListener('change', (e) => {
            this.settingsManager.set('particlesEnabled', e.target.checked);
        });
        
        document.getElementById('ghost-enabled').addEventListener('change', (e) => {
            this.settingsManager.set('ghostEnabled', e.target.checked);
        });
        
        document.getElementById('grid-enabled').addEventListener('change', (e) => {
            this.settingsManager.set('gridEnabled', e.target.checked);
        });
        
        document.getElementById('bgm-volume').addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            this.soundManager.setBGMVolume(volume);
            this.settingsManager.set('bgmVolume', volume);
        });
        
        document.getElementById('sfx-volume').addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            this.soundManager.setSFXVolume(volume);
            this.settingsManager.set('sfxVolume', volume);
        });
        
        // Pause button
        document.querySelector('.pause-button').addEventListener('click', () => {
            if (this.game) {
                this.game.togglePause();
                this.soundManager.playSound('pause');
            }
        });
        
        // Key bindings
        document.querySelectorAll('.key-bind').forEach(button => {
            button.addEventListener('click', (e) => {
                this.inputManager.startKeyBinding(e.target);
            });
        });
    }
    
    startGame(mode) {
        // Hide menu
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');
        
        // Stop menu music
        this.soundManager.stopMenuMusic();
        
        // Create game instance
        this.game = new Game({
            mode,
            renderer: this.renderer,
            soundManager: this.soundManager,
            particleSystem: this.particleSystem,
            inputManager: this.inputManager,
            settingsManager: this.settingsManager,
            networkManager: mode === 'multiplayer' ? this.networkManager : null,
            onGameOver: (stats) => this.handleGameOver(stats)
        });
        
        // Start game
        this.game.start();
        this.soundManager.playGameMusic();
        
        // Add mobile controls if needed
        if (this.isMobileDevice()) {
            this.createMobileControls();
        }
    }
    
    handleAction(action) {
        switch (action) {
            case 'settings':
                document.getElementById('settings-modal').classList.remove('hidden');
                break;
            case 'leaderboard':
                this.showLeaderboard();
                break;
        }
    }
    
    async showLeaderboard() {
        document.getElementById('leaderboard-modal').classList.remove('hidden');
        const leaderboard = await this.leaderboardManager.getLeaderboard('global');
        this.renderLeaderboard(leaderboard);
    }
    
    renderLeaderboard(entries) {
        const container = document.getElementById('leaderboard-list');
        container.innerHTML = '';
        
        entries.forEach((entry, index) => {
            const div = document.createElement('div');
            div.className = 'leaderboard-entry';
            
            const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
            
            div.innerHTML = `
                <span class="leaderboard-rank ${rankClass}">#${index + 1}</span>
                <div class="leaderboard-player">
                    <img src="${entry.avatar || 'assets/avatar-default.png'}" alt="${entry.name}" class="leaderboard-avatar">
                    <span>${entry.name}</span>
                </div>
                <span class="leaderboard-score">${entry.score.toLocaleString()}</span>
            `;
            
            container.appendChild(div);
        });
    }
    
    handleGameOver(stats) {
        // Submit score to leaderboard
        this.leaderboardManager.submitScore({
            name: this.settingsManager.get('playerName') || 'Player 1',
            score: stats.score,
            level: stats.level,
            lines: stats.lines,
            mode: stats.mode
        });
        
        // Show game over screen
        setTimeout(() => {
            if (confirm(`Game Over!\n\nScore: ${stats.score}\nLevel: ${stats.level}\nLines: ${stats.lines}\n\nPlay again?`)) {
                this.startGame(stats.mode);
            } else {
                this.returnToMenu();
            }
        }, 1000);
    }
    
    returnToMenu() {
        if (this.game) {
            this.game.destroy();
            this.game = null;
        }
        
        document.getElementById('game-container').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        
        this.soundManager.stopGameMusic();
        this.soundManager.playMenuMusic();
        
        // Remove mobile controls
        const mobileControls = document.querySelector('.mobile-controls');
        if (mobileControls) {
            mobileControls.remove();
        }
    }
    
    createBackgroundEffects() {
        // Create matrix rain effect
        const matrixContainer = document.createElement('div');
        matrixContainer.style.position = 'fixed';
        matrixContainer.style.top = '0';
        matrixContainer.style.left = '0';
        matrixContainer.style.width = '100%';
        matrixContainer.style.height = '100%';
        matrixContainer.style.pointerEvents = 'none';
        matrixContainer.style.zIndex = '0';
        document.body.appendChild(matrixContainer);
        
        const chars = 'テトリスTETRIS01';
        setInterval(() => {
            if (Math.random() > 0.98) {
                const span = document.createElement('span');
                span.className = 'matrix-rain';
                span.style.left = Math.random() * window.innerWidth + 'px';
                span.style.animationDuration = (Math.random() * 10 + 5) + 's';
                span.style.opacity = Math.random() * 0.5 + 0.1;
                span.textContent = chars[Math.floor(Math.random() * chars.length)];
                matrixContainer.appendChild(span);
                
                setTimeout(() => span.remove(), 15000);
            }
        }, 100);
    }
    
    createMobileControls() {
        const controls = document.createElement('div');
        controls.className = 'mobile-controls';
        controls.innerHTML = `
            <button class="touch-button" data-action="rotateLeft">↶</button>
            <button class="touch-button" data-action="moveLeft">←</button>
            <button class="touch-button" data-action="softDrop">↓</button>
            <button class="touch-button" data-action="moveRight">→</button>
            <button class="touch-button" data-action="rotateRight">↷</button>
            <button class="touch-button large" data-action="hardDrop">⏬</button>
            <button class="touch-button" data-action="hold">H</button>
        `;
        
        document.body.appendChild(controls);
        
        // Add touch event listeners
        controls.querySelectorAll('.touch-button').forEach(button => {
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const action = e.target.dataset.action;
                this.inputManager.handleTouch(action, 'start');
            });
            
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                const action = e.target.dataset.action;
                this.inputManager.handleTouch(action, 'end');
            });
        });
        
        // Add swipe gesture support
        this.addSwipeGestures();
    }
    
    addSwipeGestures() {
        const gameCanvas = document.getElementById('game-canvas');
        let touchStartX = 0;
        let touchStartY = 0;
        
        gameCanvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        
        gameCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        });
        
        gameCanvas.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe
                if (Math.abs(deltaX) > 50) {
                    if (deltaX > 0) {
                        this.inputManager.handleTouch('moveRight', 'tap');
                    } else {
                        this.inputManager.handleTouch('moveLeft', 'tap');
                    }
                }
            } else {
                // Vertical swipe
                if (deltaY > 50) {
                    this.inputManager.handleTouch('softDrop', 'tap');
                } else if (deltaY < -50) {
                    this.inputManager.handleTouch('rotateRight', 'tap');
                }
            }
        });
    }
    
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
}

// Global functions for modal closing
window.closeSettings = function() {
    document.getElementById('settings-modal').classList.add('hidden');
};

window.closeLeaderboard = function() {
    document.getElementById('leaderboard-modal').classList.add('hidden');
};