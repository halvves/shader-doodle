import Template from './shader-doodle-imgtex-template.js';
import BaseTexture from './shader-doodle-basetexture.js';

class ShaderDoodleImgTexture extends BaseTexture {
  static get observedAttributes() {
    return BaseTexture.observedAttributes.concat('src');
  }

  attributeChangedCallback(name, oldval, newval) {
    if (name === 'src') {
      this.img.src = newval;
    }
  }

  get src() {
    return this.getAttribute('src');
  }

  set src(val) {
    this.setAttribute('src', val);
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = Template.render();
    this.img = Template.map(this.shadow).img;
  }

  get texture() {
    return this.img;
  }
}

if (!customElements.get('shader-doodle-imgtex')) {
  customElements.define('shader-doodle-imgtex', ShaderDoodleImgTexture);
}
