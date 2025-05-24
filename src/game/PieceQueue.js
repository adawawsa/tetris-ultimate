export class PieceQueue {
    constructor() {
        this.pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        this.queue = [];
        this.bag = [];
        
        // Initialize with two bags
        this.fillQueue();
    }
    
    fillQueue() {
        while (this.queue.length < 7) {
            if (this.bag.length === 0) {
                this.bag = this.generateBag();
            }
            this.queue.push(this.bag.pop());
        }
    }
    
    generateBag() {
        // 7-bag randomizer
        const bag = [...this.pieces];
        
        // Fisher-Yates shuffle
        for (let i = bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        
        return bag;
    }
    
    getNext() {
        const piece = this.queue.shift();
        this.fillQueue();
        return piece;
    }
    
    preview(count = 5) {
        return this.queue.slice(0, count);
    }
    
    reset() {
        this.queue = [];
        this.bag = [];
        this.fillQueue();
    }
}