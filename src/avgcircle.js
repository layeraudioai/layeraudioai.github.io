// AvgCircle as a top-level class
export class AvgCircle {
    constructor() {
        // Use window dimensions for radius calculation
        this.radius = (Math.abs(window.innerWidth, window.innerHeight) / 10);
    }
    
    update() {
        this.radius = (Math.abs(window.innerWidth, window.innerHeight) / 10);
    }
}