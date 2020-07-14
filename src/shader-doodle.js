import Template from './template.js';
import SDNodeElement from './sd-node.js';
import './sd-audio.js';
import './sd-texture.js';

import Surface from './webgl/Surface.js';

class ShaderDoodleElement extends SDNodeElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    setTimeout(() => {
      try {
        this.init();
      } catch (e) {
        console.error((e && e.message) || 'Error in shader-doodle.');
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.renderer.removeSurface(this.surface);
    this.surface.dispose();
    this.surface = undefined;
  }

  async init() {
    this.shadow.innerHTML = Template.render();
    const canvas = Template.map(this.shadow).canvas;

    await super.init();

    this.surface = Surface(canvas, this.program, this);
    this.renderer.addSurface(this.surface);
  }
}

if (!customElements.get('shader-doodle')) {
  customElements.define('shader-doodle', ShaderDoodleElement);
}
