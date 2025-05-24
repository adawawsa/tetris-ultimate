export class Board {
    constructor(width = 10, height = 20) {
        this.width = width;
        this.height = height;
        this.hiddenRows = 2; // Buffer zone above visible area
        this.grid = this.createGrid();
    }
    
    createGrid() {
        return Array(this.height + this.hiddenRows).fill(null)
            .map(() => Array(this.width).fill(0));
    }
    
    reset() {
        this.grid = this.createGrid();
    }
    
    isValidPosition(x, y) {
        return x >= 0 && x < this.width && y < this.height + this.hiddenRows;
    }
    
    collides(piece) {
        return piece.getBlockPositions().some(([x, y]) => {
            return !this.isValidPosition(x, y) || (y >= 0 && this.grid[y][x]);
        });
    }
    
    addPiece(piece) {
        piece.getBlockPositions().forEach(([x, y]) => {
            if (y >= 0) {
                this.grid[y][x] = piece.type;
            }
        });
    }
    
    clearLines() {
        const clearedLines = [];
        
        for (let y = this.height - 1; y >= 0; y--) {
            if (this.isLineFull(y)) {
                clearedLines.push(y);
                this.removeLine(y);
                y++; // Check the same row again
            }
        }
        
        return clearedLines;
    }
    
    isLineFull(y) {
        return this.grid[y].every(cell => cell !== 0);
    }
    
    removeLine(y) {
        this.grid.splice(y, 1);
        this.grid.unshift(Array(this.width).fill(0));
    }
    
    isPerfectClear() {
        for (let y = 0; y < this.height; y++) {
            if (this.grid[y].some(cell => cell !== 0)) {
                return false;
            }
        }
        return true;
    }
    
    getHeight() {
        for (let y = 0; y < this.height; y++) {
            if (this.grid[y].some(cell => cell !== 0)) {
                return this.height - y;
            }
        }
        return 0;
    }
    
    getHoles() {
        let holes = 0;
        for (let x = 0; x < this.width; x++) {
            let foundBlock = false;
            for (let y = 0; y < this.height; y++) {
                if (this.grid[y][x]) {
                    foundBlock = true;
                } else if (foundBlock) {
                    holes++;
                }
            }
        }
        return holes;
    }
    
    getBumpiness() {
        const heights = [];
        for (let x = 0; x < this.width; x++) {
            let height = 0;
            for (let y = 0; y < this.height; y++) {
                if (this.grid[y][x]) {
                    height = this.height - y;
                    break;
                }
            }
            heights.push(height);
        }
        
        let bumpiness = 0;
        for (let i = 0; i < heights.length - 1; i++) {
            bumpiness += Math.abs(heights[i] - heights[i + 1]);
        }
        return bumpiness;
    }
    
    clone() {
        const newBoard = new Board(this.width, this.height);
        newBoard.grid = this.grid.map(row => [...row]);
        return newBoard;
    }
}