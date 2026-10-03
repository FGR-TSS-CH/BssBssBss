export class Input {
  constructor(element) {
    this.keys = new Set();
    this.pressed = new Set();
    this.dragging = false;
    this.pointerDelta = { x: 0, y: 0 };
    this.wheel = 0;
    this.element = element;
    addEventListener("keydown", e => {
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (["Tab","Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();
    });
    addEventListener("keyup", e => this.keys.delete(e.code));
    element.addEventListener("mousedown", e => { this.dragging = true; this.last = [e.clientX,e.clientY]; });
    addEventListener("mouseup", () => this.dragging = false);
    addEventListener("mousemove", e => {
      if (!this.dragging) return;
      this.pointerDelta.x += e.clientX - this.last[0];
      this.pointerDelta.y += e.clientY - this.last[1];
      this.last = [e.clientX,e.clientY];
    });
    element.addEventListener("wheel", e => { this.wheel += e.deltaY; e.preventDefault(); }, { passive:false });
  }
  down(code){ return this.keys.has(code); }
  consume(code){ const v=this.pressed.has(code); this.pressed.delete(code); return v; }
  frameEnd(){ this.pointerDelta.x=0; this.pointerDelta.y=0; this.wheel=0; }
}
