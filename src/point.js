export class Point {
    constructor (source) {
        this.index = source.index;
        this.cx = source.cx;
        this.cy = source.cy;
        this.PI_HALF = source.PI_HALF;
        this.TOTAL_POINTS = source.TOTAL_POINTS;
        this.w = source.w;
        this.h = source.h;
        this.angle = (this.index * 360) / this.TOTAL_POINTS;
        this.updateDynamics();
        this.value = Math.random() * 256;
        this.dx = this.x + this.value * Math.sin(this.PI_HALF * this.angle);
        this.dy = this.y + this.value * Math.cos(this.PI_HALF * this.angle);
    }

    updateDynamics(){
        this.radius = Math.abs(this.w, this.h) / 10;
        this.x = this.cx + this.radius * Math.sin(this.PI_HALF * this.angle);
        this.y = this.cy + this.radius * Math.cos(this.PI_HALF * this.angle);
    }
}