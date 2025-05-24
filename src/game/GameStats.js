export class GameStats {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.pieces = 0;
        this.tspins = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.b2b = 0;
        this.lastClear = null;
        
        // Performance metrics
        this.startTime = Date.now();
        this.piecesPerMinute = 0;
        this.attackPerMinute = 0;
        this.ppm = 0;
        this.apm = 0;
        
        // Scoring constants
        this.baseScores = {
            single: 100,
            double: 300,
            triple: 500,
            tetris: 800,
            tspin: 400,
            tspinSingle: 800,
            tspinDouble: 1200,
            tspinTriple: 1600,
            perfectClear: 3000,
            combo: 50,
            softDrop: 1,
            hardDrop: 2
        };
    }
    
    update(deltaTime) {
        // Update performance metrics
        const elapsedMinutes = (Date.now() - this.startTime) / 60000;
        this.ppm = this.pieces / elapsedMinutes;
        this.apm = this.calculateAPM(elapsedMinutes);
    }
    
    calculateAPM(elapsedMinutes) {
        // Attack Per Minute: lines sent in versus modes
        const attack = this.lines + (this.tspins * 2);
        return attack / elapsedMinutes;
    }
    
    piecePlaced() {
        this.pieces++;
    }
    
    linesCleared(count) {
        this.lines += count;
        
        // Update level
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
        }
        
        // Calculate score
        let baseScore = 0;
        switch (count) {
            case 1: baseScore = this.baseScores.single; break;
            case 2: baseScore = this.baseScores.double; break;
            case 3: baseScore = this.baseScores.triple; break;
            case 4: baseScore = this.baseScores.tetris; break;
        }
        
        // Apply multipliers
        let multiplier = this.level;
        
        // Back-to-back bonus
        if (this.isBackToBack(count)) {
            multiplier *= 1.5;
            this.b2b++;
        } else {
            this.b2b = 0;
        }
        
        // Combo bonus
        if (count > 0) {
            this.combo++;
            if (this.combo > this.maxCombo) {
                this.maxCombo = this.combo;
            }
            baseScore += this.baseScores.combo * this.combo * this.level;
        } else {
            this.combo = 0;
        }
        
        this.score += Math.floor(baseScore * multiplier);
        this.lastClear = count === 4 ? 'tetris' : count > 0 ? 'normal' : null;
    }
    
    tSpin() {
        this.tspins++;
        this.score += this.baseScores.tspin * this.level;
        this.lastClear = 'tspin';
    }
    
    tSpinClear(lines) {
        this.tspins++;
        this.lines += lines;
        
        let baseScore = 0;
        switch (lines) {
            case 1: baseScore = this.baseScores.tspinSingle; break;
            case 2: baseScore = this.baseScores.tspinDouble; break;
            case 3: baseScore = this.baseScores.tspinTriple; break;
        }
        
        // T-Spin clears are always back-to-back eligible
        let multiplier = this.level;
        if (this.lastClear === 'tspin' || this.lastClear === 'tetris') {
            multiplier *= 1.5;
            this.b2b++;
        }
        
        this.score += Math.floor(baseScore * multiplier);
        this.lastClear = 'tspin';
    }
    
    perfectClear() {
        this.score += this.baseScores.perfectClear * this.level;
    }
    
    addScore(points) {
        this.score += points;
    }
    
    isBackToBack(lines) {
        return (lines === 4 && this.lastClear === 'tetris') ||
               (this.lastClear === 'tspin');
    }
    
    reset() {
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.pieces = 0;
        this.tspins = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.b2b = 0;
        this.lastClear = null;
        this.startTime = Date.now();
        this.ppm = 0;
        this.apm = 0;
    }
}