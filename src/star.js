//Star class used by visualizer
export class  Star {
    constructor(w, h, cx, cy, avg, stars_color, stars_color_2, stars_color_special, STARS_BREAK_POINT, AVG_BREAK_POINT)
    {
        var xc, yc;

        this.x = Math.random() * w - cx;
        this.y = Math.random() * h - cy;
        this.z = this.max_depth = Math.max(w/h);
        this.radius = 0.2;

        xc = this.x > 0 ? 1 : -1;
        yc = this.y > 0 ? 1 : -1;

        if (Math.abs(this.x) > Math.abs(this.y)) {
            this.dx = 1.0;
            this.dy = Math.abs(this.y / this.x);
        } else {
            this.dx = Math.abs(this.x / this.y);
            this.dy = 1.0;
        }

        this.dx *= xc;
        this.dy *= yc;
        this.dz = -0.1;

        this.ddx = .001 * this.dx;
        this.ddy = .001 * this.dy;

        if (this.y > (cy/2)) {
            this.color = stars_color_2;
        } else {
            if (avg > AVG_BREAK_POINT + 10) {
                this.color = stars_color_2;
            } else if (avg > STARS_BREAK_POINT) {
                this.color = stars_color_special;
            } else {
                this.color = stars_color;
            }
        }

        xc = yc = null;
    }
}