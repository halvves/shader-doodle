import SDBaseElement from './sd-base.js';
import GeneralTexture from './webgl/GeneralTexture.js';

const REPEAT = 0x2901;
const CLAMP_TO_EDGE = 0x812f;
const MIRRORED_REPEAT = 0x8370;

const NEAREST = 0x2600;
const LINEAR = 0x2601;
const NEAREST_MIPMAP_NEAREST = 0x2700;
const LINEAR_MIPMAP_NEAREST = 0x2701;
const NEAREST_MIPMAP_LINEAR = 0x2702;
const LINEAR_MIPMAP_LINEAR = 0x2703;

const MAG_OPTIONS = {
  NEAREST,
  LINEAR,
};

const MIN_OPTIONS = {
  ...MAG_OPTIONS,
  NEAREST_MIPMAP_NEAREST,
  LINEAR_MIPMAP_NEAREST,
  NEAREST_MIPMAP_LINEAR,
  LINEAR_MIPMAP_LINEAR,
};

const WRAP_OPTIONS = {
  REPEAT,
  MIRRORED_REPEAT,
  CLAMP_TO_EDGE,
};

const UNNAMED_TEXTURE_PREFIX = 'u_texture';
let unnamedTextureIndex = 0;

class TextureElement extends SDBaseElement {
  static get observedAttributes() {
    return ['mag-filter', 'min-filter', 'name', 'src', 'wrap-s', 'wrap-t'];
  }

  disconnectedCallback() {
    this.program.removeTexture(this.texture);
    this.texture.dispose();
  }

  get forceUpdate() {
    return this.hasAttribute('force-update');
  }

  set forceUpdate(f) {
    if (f) {
      this.setAttribute('force-update', '');
    } else {
      this.removeAttribute('force-update');
    }
  }

  get magFilter() {
    return MAG_OPTIONS[this.getAttribute('mag-filter')] || LINEAR;
  }

  get minFilter() {
    return MIN_OPTIONS[this.getAttribute('min-filter')] || LINEAR_MIPMAP_LINEAR;
  }

  get src() {
    return this.getAttribute('src');
  }

  set src(val) {
    this.setAttribute('src', val);
  }

  get webcam() {
    return this.hasAttribute('webcam');
  }

  set webcam(cam) {
    if (cam) {
      this.setAttribute('webcam', '');
    } else {
      this.removeAttribute('webcam');
    }
  }

  get wrapS() {
    return WRAP_OPTIONS[this.getAttribute('wrap-s')] || REPEAT;
  }

  get wrapT() {
    return WRAP_OPTIONS[this.getAttribute('wrap-t')] || REPEAT;
  }

  init(program) {
    if (!this.name) {
      this.name = `${UNNAMED_TEXTURE_PREFIX}${unnamedTextureIndex++}`;
    }

    if (!this.src && !this.webcam) return;

    this.program = program;
    this.texture = GeneralTexture(
      this.renderer,
      program.getTexUnit(),
      this.name,
      this.src,
      this.webcam,
      this.wrapS,
      this.wrapT,
      this.minFilter,
      this.magFilter,
      this.forceUpdate
    );
    program.addTexture(this.texture);
  }
}

if (!customElements.get('sd-texture')) {
  customElements.define('sd-texture', TextureElement);
}

export default TextureElement;
