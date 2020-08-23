import SDBaseElement from './sd-base.js';

class SDUniformElement extends SDBaseElement {
  disconnectedCallback() {}

  get x() {
    return parseFloat(this.getAttribute('x'));
  }

  set x(newx) {
    if (newx != null) this.setAttribute('x', newx);
    else this.removeAttribute('x');
  }

  get y() {
    return parseFloat(this.getAttribute('y'));
  }

  set y(newy) {
    if (newy != null) this.setAttribute('y', newy);
    else this.removeAttribute('y');
  }

  get z() {
    return parseFloat(this.getAttribute('z'));
  }

  set z(newz) {
    if (newz != null) this.setAttribute('z', newz);
    else this.removeAttribute('z');
  }

  get w() {
    return parseFloat(this.getAttribute('w'));
  }

  set w(neww) {
    if (neww != null) this.setAttribute('w', neww);
    else this.removeAttribute('w');
  }

  getValue() {
    switch (this.type) {
      case 'vec2':
        return [this.x, this.y];
      case 'vec3':
        return [this.x, this.y, this.z];
      case 'vec4':
        return [this.x, this.y, this.z, this.w];
      default:
        return this.x;
    }
  }

  get type() {
    return this.getAttribute('type');
  }

  set type(newType) {
    if (newType != null) this.setAttribute('type', newType);
    else this.removeAttribute('type');
  }

  static get observedAttributes() {
    return ['x', 'y', 'z', 'w'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'x':
      case 'y':
      case 'z':
      case 'w':
        if (newValue != null)
          this.renderer.setUniform(this.name, this.getValue());
        break;
    }
  }

  init(program) {
    if (!this.name) {
      console.warn('sd-uniform created without a name.');
      return;
    }

    this.program = program;
    this.renderer.addUniform(this.name, this.getValue(), this.type);
  }
}

if (!customElements.get('sd-uniform')) {
  customElements.define('sd-uniform', SDUniformElement);
}
