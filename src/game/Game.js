import { Board } from './Board.js';
import { Piece } from './Piece.js';
import { PieceQueue } from './PieceQueue.js';
import { GameStats } from './GameStats.js';
import { AI } from '../ai/AI.js';

export class Game {
    constructor(options) {
        this.mode = options.mode;
        this.renderer = options.renderer;
        this.soundManager = options.soundManager;
        this.particleSystem = options.particleSystem;
        this.inputManager = options.inputManager;
        this.settingsManager = options.settingsManager;
        this.networkManager = options.networkManager;
        this.onGameOver = options.onGameOver;
        
        this.board = new Board();
        this.pieceQueue = new PieceQueue();
        this.stats = new GameStats();
        this.currentPiece = null;
        this.heldPiece = null;
        this.canHold = true;
        
        this.isPaused = false;
        this.isGameOver = false;
        this.dropTimer = 0;
        this.lockTimer = 0;
        this.lockDelay = 500;
        this.moveCounter = 0;
        this.maxMoves = 15;
        
        this.lastFrame = 0;
        this.gameTime = 0;
        
        // AI for AI battle mode
        this.ai = null;
        if (this.mode === 'ai-battle') {
            this.ai = new AI(this);
        }
        
        // Input handlers
        this.inputHandlers = {
            moveLeft: () => this.movePiece(-1, 0),
            moveRight: () => this.movePiece(1, 0),
            softDrop: () => this.softDrop(),
            hardDrop: () => this.hardDrop(),
            rotateRight: () => this.rotatePiece(1),
            rotateLeft: () => this.rotatePiece(-1),
            hold: () => this.holdPiece()
        };
        
        this.setupInputHandlers();
    }
    
    start() {
        this.spawnPiece();
        this.render();
        this.gameLoop();
    }
    
    setupInputHandlers() {
        // Keyboard controls
        this.inputManager.on('keydown', (action) => {
            if (!this.isPaused && !this.isGameOver && this.inputHandlers[action]) {
                this.inputHandlers[action]();
            }
        });
        
        // Touch controls
        this.inputManager.on('touch', (action) => {
            if (!this.isPaused && !this.isGameOver && this.inputHandlers[action]) {
                this.inputHandlers[action]();
            }
        });
        
        // Auto-repeat for movement
        this.inputManager.on('keyhold', (action) => {
            if (!this.isPaused && !this.isGameOver) {
                if (action === 'moveLeft' || action === 'moveRight' || action === 'softDrop') {
                    this.inputHandlers[action]();
                }
            }
        });
    }
    
    gameLoop(timestamp = 0) {
        if (this.isGameOver) return;
        
        const deltaTime = timestamp - this.lastFrame;
        this.lastFrame = timestamp;
        
        if (!this.isPaused) {
            this.gameTime += deltaTime;
            this.update(deltaTime);
            this.render();
        }
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    update(deltaTime) {
        // Update stats
        this.stats.update(deltaTime);
        
        // AI move
        if (this.ai && this.currentPiece) {
            this.ai.makeMove();
        }
        
        // Gravity
        this.dropTimer += deltaTime;
        const dropInterval = this.getDropInterval();
        
        if (this.dropTimer >= dropInterval) {
            this.dropTimer = 0;
            if (!this.movePiece(0, 1)) {
                // Can't move down, start lock timer
                this.lockTimer += deltaTime;
                if (this.lockTimer >= this.lockDelay || this.moveCounter >= this.maxMoves) {
                    this.lockPiece();
                }
            } else {
                this.lockTimer = 0;
            }
        }
        
        // Update particles
        this.particleSystem.update(deltaTime);
    }
    
    render() {
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render grid
        if (this.settingsManager.get('gridEnabled')) {
            this.renderer.renderGrid(ctx, this.board);
        }
        
        // Render board
        this.renderer.renderBoard(ctx, this.board);
        
        // Render ghost piece
        if (this.settingsManager.get('ghostEnabled') && this.currentPiece) {
            const ghostY = this.getGhostPosition();
            this.renderer.renderGhostPiece(ctx, this.currentPiece, ghostY);
        }
        
        // Render current piece
        if (this.currentPiece) {
            this.renderer.renderPiece(ctx, this.currentPiece);
        }
        
        // Render hold piece
        this.renderHoldPiece();
        
        // Render next pieces
        this.renderNextPieces();
        
        // Render particles
        if (this.settingsManager.get('particlesEnabled')) {
            const particlesCanvas = document.getElementById('particles-canvas');
            const particlesCtx = particlesCanvas.getContext('2d');
            particlesCtx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
            this.particleSystem.render(particlesCtx);
        }
        
        // Update UI
        this.updateUI();
    }
    
    spawnPiece() {
        this.currentPiece = new Piece(this.pieceQueue.getNext());
        this.currentPiece.x = Math.floor((this.board.width - this.currentPiece.matrix[0].length) / 2);
        this.currentPiece.y = 0;
        
        // Check game over
        if (this.board.collides(this.currentPiece)) {
            this.gameOver();
            return;
        }
        
        // Reset lock variables
        this.lockTimer = 0;
        this.moveCounter = 0;
        this.canHold = true;
        
        // Update stats
        this.stats.piecePlaced();
    }
    
    movePiece(dx, dy) {
        if (!this.currentPiece) return false;
        
        this.currentPiece.x += dx;
        this.currentPiece.y += dy;
        
        if (this.board.collides(this.currentPiece)) {
            this.currentPiece.x -= dx;
            this.currentPiece.y -= dy;
            return false;
        }
        
        // Sound effect
        if (dx !== 0) {
            this.soundManager.playSound('move');
        }
        
        // Reset lock timer on successful move
        if (dy === 0) {
            this.lockTimer = 0;
            this.moveCounter++;
        }
        
        return true;
    }
    
    rotatePiece(direction) {
        if (!this.currentPiece) return false;
        
        const originalMatrix = this.currentPiece.matrix;
        this.currentPiece.rotate(direction);
        
        // Try wall kicks
        const kicks = this.currentPiece.getWallKicks(direction);
        for (const [dx, dy] of kicks) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            
            if (!this.board.collides(this.currentPiece)) {
                // Check for T-Spin
                if (this.currentPiece.type === 'T' && this.checkTSpin()) {
                    this.stats.tSpin();
                    this.soundManager.playSound('tspin');
                    this.showAction('T-SPIN', 'tspin');
                    
                    // T-Spin particles
                    const centerX = (this.currentPiece.x + 1.5) * 30;
                    const centerY = (this.currentPiece.y + 1.5) * 30;
                    this.particleSystem.createBurst(centerX, centerY, 'secondary', 20);
                }
                
                this.soundManager.playSound('rotate');
                this.lockTimer = 0;
                this.moveCounter++;
                return true;
            }
            
            this.currentPiece.x -= dx;
            this.currentPiece.y -= dy;
        }
        
        // Can't rotate
        this.currentPiece.matrix = originalMatrix;
        return false;
    }
    
    softDrop() {
        if (this.movePiece(0, 1)) {
            this.stats.addScore(1);
            this.dropTimer = 0;
        }
    }
    
    hardDrop() {
        if (!this.currentPiece) return;
        
        let distance = 0;
        while (this.movePiece(0, 1)) {
            distance++;
        }
        
        this.stats.addScore(distance * 2);
        this.lockPiece();
        
        // Hard drop effect
        this.soundManager.playSound('hardDrop');
        const x = (this.currentPiece.x + this.currentPiece.matrix[0].length / 2) * 30;
        const y = this.currentPiece.y * 30;
        this.particleSystem.createBurst(x, y, 'primary', 10);
    }
    
    holdPiece() {
        if (!this.currentPiece || !this.canHold) return;
        
        const temp = this.currentPiece.type;
        if (this.heldPiece) {
            this.currentPiece = new Piece(this.heldPiece);
            this.currentPiece.x = Math.floor((this.board.width - this.currentPiece.matrix[0].length) / 2);
            this.currentPiece.y = 0;
        } else {
            this.spawnPiece();
        }
        
        this.heldPiece = temp;
        this.canHold = false;
        
        this.soundManager.playSound('hold');
        
        // Hold animation
        const holdCanvas = document.getElementById('hold-canvas');
        holdCanvas.classList.add('hold-animation');
        setTimeout(() => holdCanvas.classList.remove('hold-animation'), 500);
    }
    
    lockPiece() {
        if (!this.currentPiece) return;
        
        // Add piece to board
        this.board.addPiece(this.currentPiece);
        
        // Lock effect
        this.soundManager.playSound('lock');
        const blocks = this.currentPiece.getBlockPositions();
        blocks.forEach(([x, y]) => {
            this.particleSystem.createParticle(x * 30 + 15, y * 30 + 15, 'primary');
        });
        
        // Check for line clears
        const clearedLines = this.board.clearLines();
        if (clearedLines.length > 0) {
            this.handleLineClears(clearedLines);
        }
        
        // Check for perfect clear
        if (this.board.isPerfectClear()) {
            this.stats.perfectClear();
            this.soundManager.playSound('perfectClear');
            this.showAction('PERFECT CLEAR!', 'perfect');
            
            // Perfect clear effect
            const canvas = document.getElementById('game-canvas');
            const effect = document.createElement('div');
            effect.className = 'perfect-clear-effect';
            canvas.parentElement.appendChild(effect);
            setTimeout(() => effect.remove(), 1500);
        }
        
        // Spawn next piece
        this.spawnPiece();
    }
    
    handleLineClears(lines) {
        const lineCount = lines.length;
        this.stats.linesCleared(lineCount);
        
        // Sound effects
        if (lineCount === 4) {
            this.soundManager.playSound('tetris');
            this.showAction('TETRIS!', 'tetris');
        } else {
            this.soundManager.playSound('lineClear');
        }
        
        // Line clear animation
        lines.forEach((y, index) => {
            setTimeout(() => {
                // Create line clear effect
                const effect = document.createElement('div');
                effect.className = 'line-clear-effect';
                effect.style.top = y * 30 + 'px';
                document.getElementById('game-canvas').parentElement.appendChild(effect);
                
                // Particles along the line
                for (let x = 0; x < this.board.width; x++) {
                    this.particleSystem.createBurst(x * 30 + 15, y * 30 + 15, 'tertiary', 3);
                }
                
                setTimeout(() => effect.remove(), 500);
            }, index * 50);
        });
        
        // Check for back-to-back
        if (this.stats.isBackToBack(lineCount)) {
            this.showAction('BACK-TO-BACK', 'b2b');
            this.soundManager.playSound('b2b');
        }
        
        // Update combo
        if (this.stats.combo > 1) {
            this.showCombo(this.stats.combo);
        }
    }
    
    checkTSpin() {
        // Simplified T-Spin detection
        const corners = [
            [0, 0], [2, 0], [0, 2], [2, 2]
        ];
        let filledCorners = 0;
        
        for (const [dx, dy] of corners) {
            const x = this.currentPiece.x + dx;
            const y = this.currentPiece.y + dy;
            if (x < 0 || x >= this.board.width || y >= this.board.height || this.board.grid[y][x]) {
                filledCorners++;
            }
        }
        
        return filledCorners >= 3;
    }
    
    getGhostPosition() {
        const ghost = this.currentPiece.clone();
        while (!this.board.collides(ghost)) {
            ghost.y++;
        }
        return ghost.y - 1;
    }
    
    getDropInterval() {
        const baseSpeed = 1000;
        const speedIncrease = 50;
        return Math.max(50, baseSpeed - (this.stats.level - 1) * speedIncrease);
    }
    
    showAction(text, type) {
        const log = document.getElementById('action-log');
        const message = document.createElement('div');
        message.className = `action-message ${type}`;
        message.textContent = text;
        log.appendChild(message);
        log.scrollTop = log.scrollHeight;
        
        // Remove old messages
        if (log.children.length > 5) {
            log.removeChild(log.children[0]);
        }
    }
    
    showCombo(count) {
        const display = document.getElementById('combo-display');
        const countElement = display.querySelector('.combo-count');
        countElement.textContent = count;
        display.classList.remove('hidden');
        
        clearTimeout(this.comboTimeout);
        this.comboTimeout = setTimeout(() => {
            display.classList.add('hidden');
        }, 2000);
    }
    
    renderHoldPiece() {
        const canvas = document.getElementById('hold-canvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (this.heldPiece) {
            const piece = new Piece(this.heldPiece);
            const scale = 20;
            const offsetX = (canvas.width - piece.matrix[0].length * scale) / 2;
            const offsetY = (canvas.height - piece.matrix.length * scale) / 2;
            
            piece.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        ctx.fillStyle = piece.color;
                        ctx.fillRect(
                            offsetX + x * scale,
                            offsetY + y * scale,
                            scale - 2,
                            scale - 2
                        );
                    }
                });
            });
            
            if (!this.canHold) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    }
    
    renderNextPieces() {
        const nextPieces = this.pieceQueue.preview(5);
        
        nextPieces.forEach((type, index) => {
            const canvas = document.getElementById(`next-${index}`);
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const piece = new Piece(type);
            const scale = index === 0 ? 20 : 15;
            const offsetX = (canvas.width - piece.matrix[0].length * scale) / 2;
            const offsetY = (canvas.height - piece.matrix.length * scale) / 2;
            
            piece.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        ctx.fillStyle = piece.color;
                        ctx.globalAlpha = index === 0 ? 1 : 0.8 - index * 0.1;
                        ctx.fillRect(
                            offsetX + x * scale,
                            offsetY + y * scale,
                            scale - 2,
                            scale - 2
                        );
                    }
                });
            });
        });
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.stats.score.toLocaleString();
        document.getElementById('level').textContent = this.stats.level;
        document.getElementById('lines').textContent = this.stats.lines;
        document.getElementById('ppm').textContent = this.stats.ppm.toFixed(1);
        document.getElementById('apm').textContent = this.stats.apm.toFixed(1);
        document.getElementById('tspins').textContent = this.stats.tspins;
        document.getElementById('combo').textContent = this.stats.maxCombo;
        
        // Update timer
        const minutes = Math.floor(this.gameTime / 60000);
        const seconds = Math.floor((this.gameTime % 60000) / 1000);
        document.querySelector('.game-timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            // Show pause overlay
            const overlay = document.createElement('div');
            overlay.id = 'pause-overlay';
            overlay.className = 'pause-overlay';
            overlay.innerHTML = '<div class="pause-text">PAUSED</div>';
            document.getElementById('game-container').appendChild(overlay);
        } else {
            // Remove pause overlay
            const overlay = document.getElementById('pause-overlay');
            if (overlay) overlay.remove();
        }
    }
    
    gameOver() {
        this.isGameOver = true;
        this.soundManager.playSound('gameOver');
        
        // Game over effect
        const canvas = document.getElementById('game-canvas');
        canvas.classList.add('game-over');
        
        // Submit stats
        if (this.onGameOver) {
            this.onGameOver({
                score: this.stats.score,
                level: this.stats.level,
                lines: this.stats.lines,
                mode: this.mode,
                time: this.gameTime,
                ppm: this.stats.ppm,
                apm: this.stats.apm
            });
        }
    }
    
    destroy() {
        this.isGameOver = true;
        this.inputManager.removeAllListeners();
        clearTimeout(this.comboTimeout);
    }
}