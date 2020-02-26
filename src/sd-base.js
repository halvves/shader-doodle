import Renderer from './webgl/Renderer.js';

class SDBaseElement extends HTMLElement {
  get renderer() {
    return Renderer.singleton();
  }

  get name() {
    return this.getAttribute('name');
  }

  set name(val) {
    this.setAttribute('name', val);
  }
}

export default SDBaseElement;
