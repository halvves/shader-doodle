export default {
  render(w, h) {
    return `${this.css(w, h)}
            ${this.html()}`;
  },

  map(scope) {
    return {
      canvas: scope.querySelector('canvas'),
    };
  },

  html(node) {
    return `<canvas></canvas>`;
  },

  css(w, h) {
    return `<style>
      :host {
        position: relative;
        display: inline-block;
        width: ${w || 250}px;
        height: ${h || 250}px;
      }
      :host > canvas {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        border-radius: inherit;
      }
    </style>`;
  },
};
