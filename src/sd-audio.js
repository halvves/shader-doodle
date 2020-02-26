import SDBaseElement from './sd-base.js';
import AudioTexture from './webgl/AudioTexture.js';

const UNNAMED_AUDIO_PREFIX = 'u_audio';
let unnamedAudioIndex = 0;

class SDAudioElement extends SDBaseElement {
  disconnectedCallback() {
    this.program.removeTexture(this.texture);
    this.texture.dispose();
  }

  get src() {
    return this.getAttribute('src');
  }

  set src(val) {
    this.setAttribute('src', val);
  }

  get autoplay() {
    return this.hasAttribute('autoplay');
  }

  set autoplay(a) {
    if (a) {
      this.setAttribute('autoplay', '');
    } else {
      this.removeAttribute('autoplay');
    }
  }

  get loop() {
    return this.hasAttribute('loop');
  }

  set loop(l) {
    if (l) {
      this.setAttribute('loop', '');
    } else {
      this.removeAttribute('loop');
    }
  }

  get crossOrigin() {
    return this.getAttribute('crossorigin');
  }

  set crossOrigin(c) {
    this.setAttribute('crossorigin', c);
  }

  get mic() {
    return this.hasAttribute('mic');
  }

  set mic(m) {
    if (m) {
      this.setAttribute('mic', '');
    } else {
      this.removeAttribute('mic');
    }
  }

  init(program) {
    if (!this.name) {
      this.name = `${UNNAMED_AUDIO_PREFIX}${unnamedAudioIndex++}`;
    }

    if (!this.src) return;

    this.program = program;
    this.texture = AudioTexture(
      this.renderer,
      program.getTexUnit(),
      this.name,
      this.src,
      this.mic,
      this.loop,
      this.autoplay,
      this.crossOrigin
    );
    program.addTexture(this.texture);
  }
}

if (!customElements.get('sd-audio')) {
  customElements.define('sd-audio', SDAudioElement);
}
