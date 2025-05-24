export class AI {
    constructor(game) {
        this.game = game;
        this.difficulty = 'medium'; // easy, medium, hard, impossible
        this.thinkingTime = 100; // ms between moves
        this.lastMoveTime = 0;
        this.currentPlan = null;
        this.moveIndex = 0;
        
        // AI parameters based on difficulty
        this.parameters = {
            easy: {
                heightWeight: -0.5,
                linesWeight: 1.0,
                holesWeight: -1.0,
                bumpinessWeight: -0.2,
                thinkingTime: 500,
                mistakeRate: 0.2
            },
            medium: {
                heightWeight: -0.8,
                linesWeight: 2.0,
                holesWeight: -3.0,
                bumpinessWeight: -0.5,
                thinkingTime: 200,
                mistakeRate: 0.1
            },
            hard: {
                heightWeight: -1.0,
                linesWeight: 3.0,
                holesWeight: -5.0,
                bumpinessWeight: -0.8,
                perfectClearWeight: 10.0,
                tspinWeight: 5.0,
                thinkingTime: 100,
                mistakeRate: 0.05
            },
            impossible: {
                heightWeight: -1.2,
                linesWeight: 4.0,
                holesWeight: -8.0,
                bumpinessWeight: -1.0,
                perfectClearWeight: 20.0,
                tspinWeight: 8.0,
                comboWeight: 2.0,
                thinkingTime: 50,
                mistakeRate: 0
            }
        };
        
        this.setDifficulty(this.difficulty);
    }
    
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        const params = this.parameters[difficulty] || this.parameters.medium;
        Object.assign(this, params);
    }
    
    makeMove() {
        const now = Date.now();
        if (now - this.lastMoveTime < this.thinkingTime) return;
        
        // If we don't have a plan or finished executing it, create a new one
        if (!this.currentPlan || this.moveIndex >= this.currentPlan.length) {
            this.currentPlan = this.calculateBestMove();
            this.moveIndex = 0;
        }
        
        // Execute next move in plan
        if (this.currentPlan && this.moveIndex < this.currentPlan.length) {
            const move = this.currentPlan[this.moveIndex];
            this.executeMove(move);
            this.moveIndex++;
        }
        
        this.lastMoveTime = now;
    }
    
    calculateBestMove() {
        if (!this.game.currentPiece) return null;
        
        const possibleMoves = this.getAllPossibleMoves();
        let bestMove = null;
        let bestScore = -Infinity;
        
        // Evaluate each possible move
        for (const move of possibleMoves) {
            const score = this.evaluateMove(move);
            
            // Add some randomness for easier difficulties
            const adjustedScore = score + (Math.random() - 0.5) * this.mistakeRate * 100;
            
            if (adjustedScore > bestScore) {
                bestScore = adjustedScore;
                bestMove = move;
            }
        }
        
        // Sometimes make a mistake on easier difficulties
        if (Math.random() < this.mistakeRate && possibleMoves.length > 1) {
            const randomIndex = Math.floor(Math.random() * possibleMoves.length);
            bestMove = possibleMoves[randomIndex];
        }
        
        return bestMove ? this.createMovePlan(bestMove) : null;
    }
    
    getAllPossibleMoves() {
        const moves = [];
        const piece = this.game.currentPiece;
        
        // Try all rotations
        for (let rotation = 0; rotation < 4; rotation++) {
            // Try all horizontal positions
            for (let x = -3; x < this.game.board.width + 3; x++) {
                const move = {
                    x: x,
                    rotation: rotation,
                    useHold: false
                };
                
                if (this.isValidMove(move)) {
                    moves.push(move);
                }
            }
        }
        
        // Also consider using hold if available
        if (this.game.canHold && this.difficulty !== 'easy') {
            const heldPiece = this.game.heldPiece || this.game.pieceQueue.preview(1)[0];
            // Add hold moves (simplified for now)
            moves.push({ useHold: true, x: 4, rotation: 0 });
        }
        
        return moves;
    }
    
    isValidMove(move) {
        const testPiece = this.game.currentPiece.clone();
        
        // Apply rotation
        for (let i = 0; i < move.rotation; i++) {
            testPiece.rotate(1);
        }
        
        // Set position
        testPiece.x = move.x;
        testPiece.y = 0;
        
        // Check if position is valid
        return !this.game.board.collides(testPiece);
    }
    
    evaluateMove(move) {
        // Create a copy of the board to simulate the move
        const testBoard = this.game.board.clone();
        const testPiece = this.game.currentPiece.clone();
        
        // Apply the move
        if (move.useHold) {
            // Simplified hold evaluation
            return 0;
        }
        
        // Apply rotation
        for (let i = 0; i < move.rotation; i++) {
            testPiece.rotate(1);
        }
        
        // Set position and drop
        testPiece.x = move.x;
        testPiece.y = this.getDropPosition(testBoard, testPiece);
        
        // Add piece to board
        testBoard.addPiece(testPiece);
        
        // Clear lines
        const clearedLines = testBoard.clearLines();
        
        // Calculate score based on various factors
        let score = 0;
        
        // Height penalty
        score += this.heightWeight * testBoard.getHeight();
        
        // Lines cleared bonus
        score += this.linesWeight * clearedLines.length;
        
        // Holes penalty
        score += this.holesWeight * testBoard.getHoles();
        
        // Bumpiness penalty
        score += this.bumpinessWeight * testBoard.getBumpiness();
        
        // Advanced scoring for higher difficulties
        if (this.difficulty === 'hard' || this.difficulty === 'impossible') {
            // Perfect clear bonus
            if (testBoard.isPerfectClear()) {
                score += this.perfectClearWeight;
            }
            
            // T-Spin detection (simplified)
            if (testPiece.type === 'T' && this.checkPotentialTSpin(testBoard, testPiece)) {
                score += this.tspinWeight;
            }
            
            // Combo potential
            if (this.comboWeight && clearedLines.length > 0) {
                score += this.comboWeight * this.game.stats.combo;
            }
        }
        
        return score;
    }
    
    getDropPosition(board, piece) {
        const testPiece = piece.clone();
        while (!board.collides(testPiece)) {
            testPiece.y++;
        }
        return testPiece.y - 1;
    }
    
    checkPotentialTSpin(board, piece) {
        // Simplified T-Spin check
        if (piece.type !== 'T') return false;
        
        const corners = [
            [piece.x, piece.y],
            [piece.x + 2, piece.y],
            [piece.x, piece.y + 2],
            [piece.x + 2, piece.y + 2]
        ];
        
        let filledCorners = 0;
        for (const [x, y] of corners) {
            if (x < 0 || x >= board.width || y >= board.height || board.grid[y][x]) {
                filledCorners++;
            }
        }
        
        return filledCorners >= 3;
    }
    
    createMovePlan(targetMove) {
        const moves = [];
        const currentPiece = this.game.currentPiece;
        
        // Hold if needed
        if (targetMove.useHold) {
            moves.push('hold');
            return moves;
        }
        
        // Rotation moves
        for (let i = 0; i < targetMove.rotation; i++) {
            moves.push('rotateRight');
        }
        
        // Horizontal moves
        const dx = targetMove.x - currentPiece.x;
        const moveDirection = dx > 0 ? 'moveRight' : 'moveLeft';
        for (let i = 0; i < Math.abs(dx); i++) {
            moves.push(moveDirection);
        }
        
        // Drop
        moves.push('hardDrop');
        
        return moves;
    }
    
    executeMove(move) {
        switch (move) {
            case 'moveLeft':
                this.game.movePiece(-1, 0);
                break;
            case 'moveRight':
                this.game.movePiece(1, 0);
                break;
            case 'rotateRight':
                this.game.rotatePiece(1);
                break;
            case 'rotateLeft':
                this.game.rotatePiece(-1);
                break;
            case 'hardDrop':
                this.game.hardDrop();
                break;
            case 'hold':
                this.game.holdPiece();
                break;
            case 'softDrop':
                this.game.softDrop();
                break;
        }
    }
    
    // Training mode helpers
    getHint() {
        const bestMove = this.calculateBestMove();
        if (!bestMove || bestMove.length === 0) return null;
        
        return {
            moves: bestMove,
            explanation: this.explainMove(bestMove)
        };
    }
    
    explainMove(moves) {
        const explanations = [];
        
        if (moves.includes('hold')) {
            explanations.push('ホールドを使用して、より良いピースを待ちます');
        }
        
        const rotations = moves.filter(m => m.includes('rotate')).length;
        if (rotations > 0) {
            explanations.push(`${rotations}回回転させます`);
        }
        
        const horizontalMoves = moves.filter(m => m === 'moveLeft' || m === 'moveRight').length;
        if (horizontalMoves > 0) {
            const direction = moves.includes('moveLeft') ? '左' : '右';
            explanations.push(`${direction}に${horizontalMoves}マス移動します`);
        }
        
        if (moves.includes('hardDrop')) {
            explanations.push('ハードドロップで素早く配置します');
        }
        
        return explanations.join('、');
    }
    
    // Analysis functions for training mode
    analyzeBoard(board) {
        return {
            height: board.getHeight(),
            holes: board.getHoles(),
            bumpiness: board.getBumpiness(),
            fullLines: this.countFullLines(board),
            tSpinSetups: this.findTSpinSetups(board),
            dangerLevel: this.calculateDangerLevel(board)
        };
    }
    
    countFullLines(board) {
        let count = 0;
        for (let y = 0; y < board.height; y++) {
            if (board.isLineFull(y)) {
                count++;
            }
        }
        return count;
    }
    
    findTSpinSetups(board) {
        // Simplified T-Spin setup detection
        const setups = [];
        // Would implement actual T-Spin pattern recognition here
        return setups;
    }
    
    calculateDangerLevel(board) {
        const height = board.getHeight();
        const maxHeight = board.height;
        return height / maxHeight;
    }
}