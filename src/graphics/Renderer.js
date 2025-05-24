export class Renderer {
    constructor() {
        this.blockSize = 30;
        this.borderWidth = 2;
        this.shadowOpacity = 0.3;
        
        // Block styles
        this.blockStyles = {
            'I': { primary: '#00f0f0', secondary: '#00a8a8', highlight: '#5fffff' },
            'O': { primary: '#f0f000', secondary: '#a8a800', highlight: '#ffff5f' },
            'T': { primary: '#a000f0', secondary: '#7000a8', highlight: '#d45fff' },
            'S': { primary: '#00f000', secondary: '#00a800', highlight: '#5fff5f' },
            'Z': { primary: '#f00000', secondary: '#a80000', highlight: '#ff5f5f' },
            'J': { primary: '#0000f0', secondary: '#0000a8', highlight: '#5f5fff' },
            'L': { primary: '#f0a000', secondary: '#a87000', highlight: '#ffd45f' }
        };
    }
    
    renderBoard(ctx, board) {
        for (let y = 0; y < board.height; y++) {
            for (let x = 0; x < board.width; x++) {
                const block = board.grid[y][x];
                if (block) {
                    this.renderBlock(ctx, x, y, block);
                }
            }
        }
    }
    
    renderPiece(ctx, piece) {
        piece.getBlockPositions().forEach(([x, y]) => {
            if (y >= 0) {
                this.renderBlock(ctx, x, y, piece.type, true);
            }
        });
    }
    
    renderGhostPiece(ctx, piece, ghostY) {
        const ghost = piece.clone();
        ghost.y = ghostY;
        
        ctx.globalAlpha = this.shadowOpacity;
        ghost.getBlockPositions().forEach(([x, y]) => {
            if (y >= 0) {
                this.renderGhostBlock(ctx, x, y, piece.type);
            }
        });
        ctx.globalAlpha = 1;
    }
    
    renderBlock(ctx, x, y, type, isActive = false) {
        const style = this.blockStyles[type] || this.blockStyles['T'];
        const blockX = x * this.blockSize;
        const blockY = y * this.blockSize;
        const size = this.blockSize - this.borderWidth;
        
        // Main block
        ctx.fillStyle = style.primary;
        ctx.fillRect(blockX + 1, blockY + 1, size, size);
        
        // 3D effect - top and left highlights
        ctx.fillStyle = style.highlight;
        ctx.fillRect(blockX + 1, blockY + 1, size, 3);
        ctx.fillRect(blockX + 1, blockY + 1, 3, size);
        
        // 3D effect - bottom and right shadows
        ctx.fillStyle = style.secondary;
        ctx.fillRect(blockX + 1, blockY + size - 2, size, 3);
        ctx.fillRect(blockX + size - 2, blockY + 1, 3, size);
        
        // Inner highlight for active pieces
        if (isActive) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(blockX + 5, blockY + 5, size - 8, size - 8);
        }
    }
    
    renderGhostBlock(ctx, x, y, type) {
        const style = this.blockStyles[type] || this.blockStyles['T'];
        const blockX = x * this.blockSize;
        const blockY = y * this.blockSize;
        const size = this.blockSize - this.borderWidth;
        
        // Ghost outline
        ctx.strokeStyle = style.primary;
        ctx.lineWidth = 2;
        ctx.strokeRect(blockX + 1, blockY + 1, size, size);
        
        // Ghost fill
        ctx.fillStyle = style.primary;
        ctx.globalAlpha = 0.1;
        ctx.fillRect(blockX + 1, blockY + 1, size, size);
        ctx.globalAlpha = this.shadowOpacity;
    }
    
    renderGrid(ctx, board) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= board.width; x++) {
            ctx.beginPath();
            ctx.moveTo(x * this.blockSize, 0);
            ctx.lineTo(x * this.blockSize, board.height * this.blockSize);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= board.height; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * this.blockSize);
            ctx.lineTo(board.width * this.blockSize, y * this.blockSize);
            ctx.stroke();
        }
        
        // Danger zone indicator
        const dangerHeight = 4;
        if (board.getHeight() > board.height - dangerHeight) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
            ctx.fillRect(0, 0, board.width * this.blockSize, dangerHeight * this.blockSize);
        }
    }
    
    renderHoldPiece(ctx, piece, canHold) {
        if (!piece) return;
        
        const canvas = ctx.canvas;
        const scale = 20;
        const pieceData = this.getPieceData(piece);
        const offsetX = (canvas.width - pieceData[0].length * scale) / 2;
        const offsetY = (canvas.height - pieceData.length * scale) / 2;
        
        pieceData.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const style = this.blockStyles[piece];
                    ctx.fillStyle = canHold ? style.primary : 'rgba(128, 128, 128, 0.5)';
                    ctx.fillRect(
                        offsetX + x * scale,
                        offsetY + y * scale,
                        scale - 2,
                        scale - 2
                    );
                }
            });
        });
    }
    
    renderNextPiece(ctx, piece, scale = 20) {
        if (!piece) return;
        
        const canvas = ctx.canvas;
        const pieceData = this.getPieceData(piece);
        const offsetX = (canvas.width - pieceData[0].length * scale) / 2;
        const offsetY = (canvas.height - pieceData.length * scale) / 2;
        
        pieceData.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const style = this.blockStyles[piece];
                    ctx.fillStyle = style.primary;
                    ctx.fillRect(
                        offsetX + x * scale,
                        offsetY + y * scale,
                        scale - 2,
                        scale - 2
                    );
                }
            });
        });
    }
    
    getPieceData(type) {
        const pieces = {
            'I': [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
            'O': [[1,1], [1,1]],
            'T': [[0,1,0], [1,1,1], [0,0,0]],
            'S': [[0,1,1], [1,1,0], [0,0,0]],
            'Z': [[1,1,0], [0,1,1], [0,0,0]],
            'J': [[1,0,0], [1,1,1], [0,0,0]],
            'L': [[0,0,1], [1,1,1], [0,0,0]]
        };
        return pieces[type] || pieces['T'];
    }
}