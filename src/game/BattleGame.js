import { Game } from './Game.js';
import { Board } from './Board.js';
import { Piece } from './Piece.js';
import { Renderer } from '../graphics/Renderer.js';
import { AI } from '../ai/AI.js';

export class BattleGame {
    constructor() {
        // Create two separate game instances
        this.playerGame = new Game({
            mode: 'battle-player',
            renderer: null,
            soundManager: null,
            particleSystem: null,
            inputManager: null,
            settingsManager: null,
            networkManager: null,
            onGameOver: null
        });
        this.aiGame = new Game({
            mode: 'battle-ai',
            renderer: null,
            soundManager: null,
            particleSystem: null,
            inputManager: null,
            settingsManager: null,
            networkManager: null,
            onGameOver: null
        });
        
        // Set up canvases
        this.setupCanvases();
        
        // Set up input for player only
        this.setupPlayerInput();
        
        // Create renderers for both games
        this.playerRenderer = new Renderer();
        this.aiRenderer = new Renderer();
        
        // Initialize AI
        this.ai = new AI(this.aiGame);
        this.aiGame.ai = this.ai;
        
        // Get required managers from window if available
        if (window.tetrisUltimate) {
            this.soundManager = window.tetrisUltimate.soundManager;
            this.particleSystem = window.tetrisUltimate.particleSystem;
            this.settingsManager = window.tetrisUltimate.settingsManager;
            
            // Set managers for both games
            this.playerGame.soundManager = this.soundManager;
            this.playerGame.particleSystem = this.particleSystem;
            this.playerGame.settingsManager = this.settingsManager;
            this.playerGame.renderer = this.playerRenderer;
            
            this.aiGame.soundManager = this.soundManager;
            this.aiGame.particleSystem = this.particleSystem;
            this.aiGame.settingsManager = this.settingsManager;
            this.aiGame.renderer = this.aiRenderer;
        }
        
        // Battle specific properties
        this.attackQueue = {
            player: [],
            ai: []
        };
        
        this.battleStats = {
            player: {
                garbageSent: 0,
                garbageReceived: 0,
                knockouts: 0
            },
            ai: {
                garbageSent: 0,
                garbageReceived: 0,
                knockouts: 0
            }
        };
        
        this.battleTimer = 0;
        this.battleActive = false;
        this.winner = null;
        
        // Set up event listeners
        this.setupBattleEvents();
    }
    
    setupPlayerInput() {
        // Set up keyboard controls for player game only
        document.addEventListener('keydown', (e) => {
            if (!this.battleActive || this.playerGame.paused) return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    this.playerGame.movePiece(-1, 0);
                    break;
                case 'ArrowRight':
                    this.playerGame.movePiece(1, 0);
                    break;
                case 'ArrowDown':
                    this.playerGame.softDrop();
                    break;
                case 'ArrowUp':
                case 'x':
                case 'X':
                    this.playerGame.rotatePiece(1);
                    break;
                case 'z':
                case 'Z':
                case 'Control':
                    this.playerGame.rotatePiece(-1);
                    break;
                case ' ':
                    this.playerGame.hardDrop();
                    break;
                case 'c':
                case 'C':
                case 'Shift':
                    this.playerGame.holdPiece();
                    break;
                case 'p':
                case 'P':
                case 'Escape':
                    this.togglePause();
                    break;
            }
        });
    }
    
    togglePause() {
        if (this.battleActive) {
            this.pause();
        } else {
            this.resume();
        }
    }
    
    setupCanvases() {
        // Player canvases
        this.playerCanvas = document.getElementById('player-canvas');
        this.playerHoldCanvas = document.getElementById('player-hold');
        this.playerNextCanvases = [
            document.getElementById('player-next-0'),
            document.getElementById('player-next-1'),
            document.getElementById('player-next-2')
        ];
        
        // AI canvases
        this.aiCanvas = document.getElementById('ai-canvas');
        this.aiHoldCanvas = document.getElementById('ai-hold');
        this.aiNextCanvases = [
            document.getElementById('ai-next-0'),
            document.getElementById('ai-next-1'),
            document.getElementById('ai-next-2')
        ];
        
        // Set up contexts
        if (this.playerCanvas) {
            this.playerGame.canvas = this.playerCanvas;
            this.playerGame.ctx = this.playerCanvas.getContext('2d');
        }
        
        if (this.aiCanvas) {
            this.aiGame.canvas = this.aiCanvas;
            this.aiGame.ctx = this.aiCanvas.getContext('2d');
        }
    }
    
    setupBattleEvents() {
        // Listen for line clears from both games
        this.playerGame.onLinesClear = (lines) => this.handleLinesClear('player', lines);
        this.aiGame.onLinesClear = (lines) => this.handleLinesClear('ai', lines);
        
        // Listen for game over
        this.playerGame.onGameOver = () => this.handleGameOver('ai');
        this.aiGame.onGameOver = () => this.handleGameOver('player');
    }
    
    handleLinesClear(sender, linesCleared) {
        if (!this.battleActive) return;
        
        let attackLines = 0;
        
        // Calculate attack lines based on clear type
        switch (linesCleared.length) {
            case 1:
                attackLines = 0; // Single sends 0
                break;
            case 2:
                attackLines = 1; // Double sends 1
                break;
            case 3:
                attackLines = 2; // Triple sends 2
                break;
            case 4:
                attackLines = 4; // Tetris sends 4
                break;
        }
        
        // Check for special clears
        if (this.playerGame.stats.lastClearWasTSpin && sender === 'player') {
            attackLines += 2; // T-Spin bonus
        }
        if (this.aiGame.stats.lastClearWasTSpin && sender === 'ai') {
            attackLines += 2; // T-Spin bonus
        }
        
        // Check for Perfect Clear
        const game = sender === 'player' ? this.playerGame : this.aiGame;
        if (game.board.isPerfectClear()) {
            attackLines = 10; // Perfect Clear sends 10
        }
        
        // Back-to-Back bonus
        if (game.stats.b2b > 1) {
            attackLines = Math.floor(attackLines * 1.5);
        }
        
        // Add to attack queue
        if (attackLines > 0) {
            const target = sender === 'player' ? 'ai' : 'player';
            this.attackQueue[target].push(attackLines);
            this.battleStats[sender].garbageSent += attackLines;
            
            // Update attack display
            this.updateAttackDisplay(sender, attackLines);
        }
    }
    
    processAttacks() {
        // Process attacks for player
        if (this.attackQueue.player.length > 0) {
            const totalAttack = this.attackQueue.player.reduce((a, b) => a + b, 0);
            this.attackQueue.player = [];
            
            // Try to counter with pending attacks
            let remaining = totalAttack;
            if (this.attackQueue.ai.length > 0) {
                const counter = this.attackQueue.ai.reduce((a, b) => a + b, 0);
                this.attackQueue.ai = [];
                remaining = Math.max(0, totalAttack - counter);
                
                if (counter > totalAttack) {
                    this.attackQueue.ai.push(counter - totalAttack);
                }
            }
            
            // Add garbage lines
            if (remaining > 0) {
                this.addGarbageLines(this.playerGame, remaining);
                this.battleStats.player.garbageReceived += remaining;
            }
        }
        
        // Process attacks for AI
        if (this.attackQueue.ai.length > 0) {
            const totalAttack = this.attackQueue.ai.reduce((a, b) => a + b, 0);
            this.attackQueue.ai = [];
            
            // Add garbage lines
            this.addGarbageLines(this.aiGame, totalAttack);
            this.battleStats.ai.garbageReceived += totalAttack;
        }
    }
    
    addGarbageLines(game, count) {
        const board = game.board;
        const grid = board.grid;
        
        // Shift existing lines up
        for (let y = 0; y < board.height - count; y++) {
            grid[y] = [...grid[y + count]];
        }
        
        // Add garbage lines at bottom
        const holeColumn = Math.floor(Math.random() * board.width);
        for (let y = board.height - count; y < board.height; y++) {
            grid[y] = new Array(board.width).fill(8); // Gray color for garbage
            grid[y][holeColumn] = 0; // One hole per line
        }
        
        // Check if current piece collides
        if (game.currentPiece && board.collides(game.currentPiece)) {
            // Move piece up
            game.currentPiece.y = Math.max(0, game.currentPiece.y - count);
            
            // If still collides, game over
            if (board.collides(game.currentPiece)) {
                game.gameOver = true;
            }
        }
    }
    
    updateAttackDisplay(sender, lines) {
        const attackLeft = document.querySelector('.attack-left');
        const attackRight = document.querySelector('.attack-right');
        
        if (sender === 'player' && attackRight) {
            attackRight.textContent = lines;
            attackRight.style.color = '#00ffff';
            setTimeout(() => {
                attackRight.style.color = '#fff';
            }, 500);
        } else if (sender === 'ai' && attackLeft) {
            attackLeft.textContent = lines;
            attackLeft.style.color = '#ff6b6b';
            setTimeout(() => {
                attackLeft.style.color = '#fff';
            }, 500);
        }
    }
    
    handleGameOver(winner) {
        this.battleActive = false;
        this.winner = winner;
        
        // Show result
        this.showBattleResult(winner);
    }
    
    showBattleResult(winner) {
        const resultModal = document.getElementById('battle-result');
        const winnerDiv = document.querySelector('.result-winner');
        const playerStats = document.querySelector('.player-final-stats');
        const aiStats = document.querySelector('.ai-final-stats');
        
        if (resultModal) {
            resultModal.classList.remove('hidden');
            
            if (winnerDiv) {
                winnerDiv.textContent = winner === 'player' ? 'YOU WIN!' : 'AI WINS!';
                winnerDiv.style.color = winner === 'player' ? '#00ffff' : '#ff6b6b';
            }
            
            if (playerStats) {
                playerStats.innerHTML = `
                    <h3>Player</h3>
                    <p>Score: ${this.playerGame.stats.score}</p>
                    <p>Lines: ${this.playerGame.stats.lines}</p>
                    <p>Attack Sent: ${this.battleStats.player.garbageSent}</p>
                    <p>Time: ${this.formatTime(this.battleTimer)}</p>
                `;
            }
            
            if (aiStats) {
                aiStats.innerHTML = `
                    <h3>AI (${this.ai.difficulty})</h3>
                    <p>Score: ${this.aiGame.stats.score}</p>
                    <p>Lines: ${this.aiGame.stats.lines}</p>
                    <p>Attack Sent: ${this.battleStats.ai.garbageSent}</p>
                    <p>Time: ${this.formatTime(this.battleTimer)}</p>
                `;
            }
        }
    }
    
    start(difficulty = 'medium') {
        // Set AI difficulty
        this.ai.setDifficulty(difficulty);
        
        // Update difficulty display
        const difficultyDisplay = document.querySelector('.ai-difficulty');
        if (difficultyDisplay) {
            difficultyDisplay.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
        }
        
        // Hide other containers
        document.getElementById('main-menu')?.classList.add('hidden');
        document.getElementById('game-container')?.classList.add('hidden');
        document.getElementById('battle-container')?.classList.remove('hidden');
        document.getElementById('battle-result')?.classList.add('hidden');
        
        // Set up result buttons
        this.setupResultButtons();
        
        // Start both games
        this.playerGame.start();
        this.aiGame.start();
        
        this.battleActive = true;
        this.battleTimer = 0;
        
        // Start game loop
        this.gameLoop();
    }
    
    gameLoop() {
        if (!this.battleActive) return;
        
        // Update games
        this.playerGame.update();
        this.aiGame.update();
        
        // AI makes moves
        if (this.aiGame.currentPiece) {
            this.ai.makeMove();
        }
        
        // Process attacks
        this.processAttacks();
        
        // Update battle timer
        this.battleTimer += 1/60; // Assuming 60 FPS
        this.updateTimerDisplay();
        
        // Render both games
        this.render();
        
        // Update stats display
        this.updateStatsDisplay();
        
        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }
    
    render() {
        // Render player game
        if (this.playerCanvas && this.playerGame.ctx) {
            if (this.playerRenderer && this.playerRenderer.render) {
                this.playerRenderer.render(this.playerGame, this.playerCanvas, this.playerGame.ctx);
            } else {
                // Basic rendering without renderer
                this.basicRender(this.playerGame, this.playerCanvas, this.playerGame.ctx);
            }
            
            // Render hold piece
            if (this.playerHoldCanvas) {
                const holdCtx = this.playerHoldCanvas.getContext('2d');
                this.renderHoldPiece(this.playerGame, holdCtx, this.playerHoldCanvas);
            }
            
            // Render next pieces
            this.renderNextPieces(this.playerGame, this.playerNextCanvases);
        }
        
        // Render AI game
        if (this.aiCanvas && this.aiGame.ctx) {
            if (this.aiRenderer && this.aiRenderer.render) {
                this.aiRenderer.render(this.aiGame, this.aiCanvas, this.aiGame.ctx);
            } else {
                // Basic rendering without renderer
                this.basicRender(this.aiGame, this.aiCanvas, this.aiGame.ctx);
            }
            
            // Render hold piece
            if (this.aiHoldCanvas) {
                const holdCtx = this.aiHoldCanvas.getContext('2d');
                this.renderHoldPiece(this.aiGame, holdCtx, this.aiHoldCanvas);
            }
            
            // Render next pieces
            this.renderNextPieces(this.aiGame, this.aiNextCanvases);
        }
    }
    
    renderHoldPiece(game, ctx, canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (game.heldPiece) {
            const blockSize = 20;
            const piece = new Piece(game.heldPiece);
            const shape = piece.matrix;
            
            const offsetX = (canvas.width - shape[0].length * blockSize) / 2;
            const offsetY = (canvas.height - shape.length * blockSize) / 2;
            
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x]) {
                        ctx.fillStyle = piece.color;
                        ctx.fillRect(
                            offsetX + x * blockSize,
                            offsetY + y * blockSize,
                            blockSize - 1,
                            blockSize - 1
                        );
                    }
                }
            }
        }
    }
    
    renderNextPieces(game, canvases) {
        const nextPieceTypes = game.pieceQueue.preview(3);
        
        nextPieceTypes.forEach((pieceType, index) => {
            if (canvases[index]) {
                const canvas = canvases[index];
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Create temporary piece to get its shape
                const piece = new Piece(pieceType);
                const blockSize = index === 0 ? 20 : 15;
                const shape = piece.matrix;
                
                const offsetX = (canvas.width - shape[0].length * blockSize) / 2;
                const offsetY = (canvas.height - shape.length * blockSize) / 2;
                
                for (let y = 0; y < shape.length; y++) {
                    for (let x = 0; x < shape[y].length; x++) {
                        if (shape[y][x]) {
                            ctx.fillStyle = piece.color;
                            ctx.fillRect(
                                offsetX + x * blockSize,
                                offsetY + y * blockSize,
                                blockSize - 1,
                                blockSize - 1
                            );
                        }
                    }
                }
            }
        });
    }
    
    updateTimerDisplay() {
        const timerElement = document.getElementById('battle-timer');
        if (timerElement) {
            timerElement.textContent = this.formatTime(this.battleTimer);
        }
    }
    
    updateStatsDisplay() {
        // Player stats
        document.getElementById('player-score').textContent = this.playerGame.stats.score;
        document.getElementById('player-lines').textContent = this.playerGame.stats.lines;
        document.getElementById('player-apm').textContent = this.calculateAPM(this.playerGame);
        
        // AI stats
        document.getElementById('ai-score').textContent = this.aiGame.stats.score;
        document.getElementById('ai-lines').textContent = this.aiGame.stats.lines;
        document.getElementById('ai-apm').textContent = this.calculateAPM(this.aiGame);
        
        // Update combo displays
        this.updateComboDisplay('player', this.playerGame.stats.combo);
        this.updateComboDisplay('ai', this.aiGame.stats.combo);
    }
    
    updateComboDisplay(side, combo) {
        const comboElement = document.querySelector(`.${side}-combo`);
        if (comboElement) {
            if (combo > 0) {
                comboElement.classList.remove('hidden');
                comboElement.querySelector('.combo-num').textContent = combo;
            } else {
                comboElement.classList.add('hidden');
            }
        }
    }
    
    calculateAPM(game) {
        if (this.battleTimer === 0) return 0;
        const minutes = this.battleTimer / 60;
        return Math.floor(this.battleStats[game === this.playerGame ? 'player' : 'ai'].garbageSent / minutes);
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    pause() {
        this.battleActive = false;
        this.playerGame.paused = true;
        this.aiGame.paused = true;
    }
    
    resume() {
        this.battleActive = true;
        this.playerGame.paused = false;
        this.aiGame.paused = false;
        this.gameLoop();
    }
    
    reset() {
        this.playerGame.reset();
        this.aiGame.reset();
        this.battleTimer = 0;
        this.battleActive = false;
        this.winner = null;
        this.attackQueue = { player: [], ai: [] };
        this.battleStats = {
            player: { garbageSent: 0, garbageReceived: 0, knockouts: 0 },
            ai: { garbageSent: 0, garbageReceived: 0, knockouts: 0 }
        };
    }
    
    basicRender(game, canvas, ctx) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate block size
        const blockSize = canvas.width / game.board.width;
        
        // Draw grid lines
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= game.board.width; x++) {
            ctx.beginPath();
            ctx.moveTo(x * blockSize, 0);
            ctx.lineTo(x * blockSize, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= game.board.height; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * blockSize);
            ctx.lineTo(canvas.width, y * blockSize);
            ctx.stroke();
        }
        
        // Draw board
        for (let y = 0; y < game.board.height; y++) {
            for (let x = 0; x < game.board.width; x++) {
                if (game.board.grid[y][x]) {
                    ctx.fillStyle = this.getBlockColor(game.board.grid[y][x]);
                    ctx.fillRect(
                        x * blockSize + 1,
                        y * blockSize + 1,
                        blockSize - 2,
                        blockSize - 2
                    );
                }
            }
        }
        
        // Draw ghost piece
        if (game.currentPiece) {
            const ghostY = this.getGhostPosition(game);
            const piece = game.currentPiece;
            ctx.fillStyle = piece.color + '40'; // 40 = 25% opacity
            
            for (let y = 0; y < piece.matrix.length; y++) {
                for (let x = 0; x < piece.matrix[y].length; x++) {
                    if (piece.matrix[y][x]) {
                        ctx.fillRect(
                            (piece.x + x) * blockSize + 1,
                            (ghostY + y) * blockSize + 1,
                            blockSize - 2,
                            blockSize - 2
                        );
                    }
                }
            }
        }
        
        // Draw current piece
        if (game.currentPiece) {
            const piece = game.currentPiece;
            ctx.fillStyle = piece.color;
            
            for (let y = 0; y < piece.matrix.length; y++) {
                for (let x = 0; x < piece.matrix[y].length; x++) {
                    if (piece.matrix[y][x]) {
                        ctx.fillRect(
                            (piece.x + x) * blockSize + 1,
                            (piece.y + y) * blockSize + 1,
                            blockSize - 2,
                            blockSize - 2
                        );
                    }
                }
            }
        }
    }
    
    getGhostPosition(game) {
        const piece = game.currentPiece;
        let ghostY = piece.y;
        
        // Move piece down until it collides
        while (!game.board.collides({ ...piece, y: ghostY + 1 })) {
            ghostY++;
        }
        
        return ghostY;
    }
    
    getBlockColor(value) {
        const colors = [
            '#000000', // 0: empty
            '#00FFFF', // 1: I - Cyan
            '#FFFF00', // 2: O - Yellow  
            '#800080', // 3: T - Purple
            '#00FF00', // 4: S - Green
            '#FF0000', // 5: Z - Red
            '#0000FF', // 6: J - Blue
            '#FFA500', // 7: L - Orange
            '#808080'  // 8: Garbage - Gray
        ];
        return colors[value] || '#FFFFFF';
    }
    
    setupResultButtons() {
        const rematchButton = document.querySelector('.rematch-button');
        const menuButton = document.querySelector('.menu-button');
        
        if (rematchButton) {
            rematchButton.onclick = () => {
                this.reset();
                document.getElementById('battle-result').classList.add('hidden');
                this.start(this.ai.difficulty);
            };
        }
        
        if (menuButton) {
            menuButton.onclick = () => {
                this.reset();
                document.getElementById('battle-result').classList.add('hidden');
                document.getElementById('battle-container').classList.add('hidden');
                document.getElementById('main-menu').classList.remove('hidden');
            };
        }
    }
    
    getColor(pieceType) {
        const colors = {
            0: '#00ffff', // I - Cyan
            1: '#0000ff', // J - Blue
            2: '#ff7f00', // L - Orange
            3: '#ffff00', // O - Yellow
            4: '#00ff00', // S - Green
            5: '#ff0000', // Z - Red
            6: '#800080'  // T - Purple
        };
        return colors[pieceType] || '#888888';
    }
    
    basicRender(game, canvas, ctx) {
        const blockSize = canvas.width / 10;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        ctx.strokeStyle = '#222';
        for (let x = 0; x <= 10; x++) {
            ctx.beginPath();
            ctx.moveTo(x * blockSize, 0);
            ctx.lineTo(x * blockSize, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= 20; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * blockSize);
            ctx.lineTo(canvas.width, y * blockSize);
            ctx.stroke();
        }
        
        // Draw board
        if (game.board && game.board.grid) {
            for (let y = 0; y < game.board.height; y++) {
                for (let x = 0; x < game.board.width; x++) {
                    if (game.board.grid[y][x] !== 0) {
                        ctx.fillStyle = this.getColor(game.board.grid[y][x] - 1);
                        ctx.fillRect(x * blockSize, y * blockSize, blockSize - 1, blockSize - 1);
                    }
                }
            }
        }
        
        // Draw current piece
        if (game.currentPiece) {
            const piece = game.currentPiece;
            const shape = piece.matrix;
            ctx.fillStyle = this.getColor(piece.type);
            
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x]) {
                        ctx.fillRect(
                            (piece.x + x) * blockSize,
                            (piece.y + y) * blockSize,
                            blockSize - 1,
                            blockSize - 1
                        );
                    }
                }
            }
        }
    }
}