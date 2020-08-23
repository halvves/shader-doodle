import Template from './template.js';
import SDNodeElement from './sd-node.js';
import './sd-audio.js';
import './sd-texture.js';
import './sd-uniform.js';

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

  get height() {
    const height = parseInt(this.getAttribute('height'));

    return Number.isInteger(height) ? height : undefined;
  }

  set height(h) {
    const height = parseInt(h);
    if (!Number.isInteger(height)) return;

    this.setAttribute('height', h);
  }

  get width() {
    const width = parseInt(this.getAttribute('width'));

    return Number.isInteger(width) ? width : undefined;
  }

  set width(w) {
    const width = parseInt(w);
    if (!Number.isInteger(width)) return;

    this.setAttribute('width', width);
  }

  async init() {
    this.shadow.innerHTML = Template.render();
    this.canvas = Template.map(this.shadow).canvas;

    await super.init();

    this.surface = Surface(this);
    this.renderer.addSurface(this.surface);
  }
}

if (!customElements.get('shader-doodle')) {
  customElements.define('shader-doodle', ShaderDoodleElement);
}
