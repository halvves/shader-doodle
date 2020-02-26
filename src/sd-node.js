import SDBaseElement from './sd-base.js';
import Program from './webgl/Program.js';

import asyncGetScriptContent from './utils/asyncGetScriptContent.js';

// prettier-ignore
const DEFAULT_VS =
`attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

// prettier-ignore
const DEFAULT_VERTICES = new Float32Array([
  -1, 1, 1, 1, 1, -1,
  -1, 1, 1, -1, -1, -1,
]);

const UNNAMED_NODE_PREFIX = 'u_node';
let unnamedNodeIndex = 0;

class SDNodeElement extends SDBaseElement {
  disconnectedCallback() {
    this.program.dispose();
    this.program = undefined;
  }

  get shadertoy() {
    return this.hasAttribute('shadertoy');
  }

  set shadertoy(s) {
    if (s) {
      this.setAttribute('shadertoy', '');
    } else {
      this.removeAttribute('shadertoy');
    }
  }

  get prevbuffer() {
    return this.hasAttribute('prevbuffer');
  }

  set prevbuffer(s) {
    if (s) {
      this.setAttribute('prevbuffer', '');
    } else {
      this.removeAttribute('prevbuffer');
    }
  }

  get vertices() {
    let v = this.getAttribute('vertices');
    if (!v) {
      return DEFAULT_VERTICES;
    }

    v = JSON.parse(v);
    if (!Array.isArray(v)) {
      return DEFAULT_VERTICES;
    }

    return new Float32Array(v);
  }

  set vertices(v) {
    if (!v || !Array.isArray(v)) {
      return;
    }

    this.setAttribute('vertices', JSON.stringify(v));
  }

  async init(parentProgram) {
    if (parentProgram && !this.name) {
      this.name = `${UNNAMED_NODE_PREFIX}${unnamedNodeIndex++}`;
    }

    const elems = [];
    let vs;
    let fs;

    for (let i = 0; i < this.children.length; i++) {
      const c = this.children[i];
      if (c instanceof SDBaseElement) {
        elems.push(c);
      } else {
        switch (c.getAttribute('type')) {
          case 'x-shader/x-fragment':
            fs = await asyncGetScriptContent(c);
            break;

          case 'x-shader/x-vertex':
            vs = await asyncGetScriptContent(c);
            break;
        }
      }
    }

    vs = vs || DEFAULT_VS;

    this.program = Program(
      this.renderer.gl,
      vs,
      fs,
      this.vertices,
      this.shadertoy
    );

    elems.forEach(e => {
      e.init(this.program);
    });

    if (parentProgram) {
      parentProgram.addNode(this.program, this.name, this.prevbuffer);
    }
  }
}

if (!customElements.get('sd-node')) {
  customElements.define('sd-node', SDNodeElement);
}

export default SDNodeElement;
