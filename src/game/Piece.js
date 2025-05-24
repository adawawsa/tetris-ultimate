export class Piece {
    constructor(type) {
        this.type = type;
        this.x = 0;
        this.y = 0;
        this.rotation = 0;
        this.matrix = this.createMatrix(type);
        this.color = this.getColor(type);
    }
    
    createMatrix(type) {
        const pieces = {
            'I': [
                [0, 0, 0, 0],
                [1, 1, 1, 1],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ],
            'O': [
                [1, 1],
                [1, 1]
            ],
            'T': [
                [0, 1, 0],
                [1, 1, 1],
                [0, 0, 0]
            ],
            'S': [
                [0, 1, 1],
                [1, 1, 0],
                [0, 0, 0]
            ],
            'Z': [
                [1, 1, 0],
                [0, 1, 1],
                [0, 0, 0]
            ],
            'J': [
                [1, 0, 0],
                [1, 1, 1],
                [0, 0, 0]
            ],
            'L': [
                [0, 0, 1],
                [1, 1, 1],
                [0, 0, 0]
            ]
        };
        
        return pieces[type] || pieces['T'];
    }
    
    getColor(type) {
        const colors = {
            'I': '#00f0f0',
            'O': '#f0f000',
            'T': '#a000f0',
            'S': '#00f000',
            'Z': '#f00000',
            'J': '#0000f0',
            'L': '#f0a000'
        };
        
        return colors[type] || '#ffffff';
    }
    
    rotate(direction) {
        const N = this.matrix.length;
        const rotated = Array(N).fill(null).map(() => Array(N).fill(0));
        
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                if (direction === 1) {
                    // Clockwise
                    rotated[j][N - 1 - i] = this.matrix[i][j];
                } else {
                    // Counter-clockwise
                    rotated[N - 1 - j][i] = this.matrix[i][j];
                }
            }
        }
        
        this.matrix = rotated;
        this.rotation = (this.rotation + direction + 4) % 4;
    }
    
    getWallKicks(direction) {
        // SRS (Super Rotation System) wall kick data
        const wallKickData = {
            'I': {
                '0->1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
                '1->0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
                '1->2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
                '2->1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
                '2->3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
                '3->2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
                '3->0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
                '0->3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
            },
            'default': {
                '0->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
                '1->0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
                '1->2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
                '2->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
                '2->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
                '3->2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
                '3->0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
                '0->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
            }
        };
        
        if (this.type === 'O') {
            return [[0, 0]]; // O piece doesn't need wall kicks
        }
        
        const data = wallKickData[this.type] || wallKickData['default'];
        const fromRotation = (this.rotation - direction + 4) % 4;
        const toRotation = this.rotation;
        const key = `${fromRotation}->${toRotation}`;
        
        return data[key] || [[0, 0]];
    }
    
    getBlockPositions() {
        const positions = [];
        this.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    positions.push([this.x + x, this.y + y]);
                }
            });
        });
        return positions;
    }
    
    clone() {
        const cloned = new Piece(this.type);
        cloned.x = this.x;
        cloned.y = this.y;
        cloned.rotation = this.rotation;
        cloned.matrix = this.matrix.map(row => [...row]);
        return cloned;
    }
}