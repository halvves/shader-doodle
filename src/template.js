export default {
  render() {
    return `${this.css()}
            ${this.html()}`;
  },

  defaultVertexShader() {
      return `attribute vec2 position;
              
              void main() {
                gl_Position = vec4(position, 0.0, 1.0);
              }`;
  },

  map(scope) {
    return {
      canvas: scope.querySelector('canvas')
    }
  },

  html(node) {
    return  `<canvas></canvas>`;
  },

  css() {
    return `<style>
      :host {
        position: relative;
        display: inline-block;
        width: 250px;
        height: 250px;
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
  }
}
