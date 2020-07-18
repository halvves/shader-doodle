import SDBaseElement from './sd-base.js';

class SDUniformElement extends SDBaseElement {
  disconnectedCallback() {}

  get x() {
    return parseFloat(this.getAttribute('x'));
  }

  set x(newX) {
    if (newX != null) this.setAttribute('x', newX);
    else this.removeAttribute('x');
  }

  get type() {
    return this.getAttribute('type');
  }

  set type(newType) {
    if (newType != null) this.setAttribute('type', newType);
    else this.removeAttribute('type');
  }

  static get observedAttributes() {
    return ['x'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'x':
        if (newValue != null) this.renderer.setUniform(this.name, newValue);
        break;
    }
  }

  init(program) {
    if (!this.name) {
      console.warn('sd-uniform created without a name.');
      return;
    }

    this.program = program;
    this.renderer.addUniform(this.name, this.x, this.type);
  }
}

if (!customElements.get('sd-uniform')) {
  customElements.define('sd-uniform', SDUniformElement);
}
