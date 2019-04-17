import Template from './shader-doodle-camtex-template.js';
import BaseTexture from './shader-doodle-basetexture.js';

class ShaderDoodleCamtex extends BaseTexture {
  constructor() {
    super();
    this._ready = false;
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = Template.render();
    this.video = Template.map(this.shadow).video;
  }

  get shouldUpdate() {
    return true;
  }

  get isReady() {
    return this._ready;
  }

  get texture() {
    return this.video;
  }

  connectedCallback() {
    navigator.mediaDevices.getUserMedia({ audio: false, video: true })
      .then( stream => this.onCameraStream(stream));
  }

  onCameraStream(stream) {
    this.video.srcObject = stream;
    this.video.addEventListener('playing', () => {
      if ( this.video.readyState == 4 ) {
        this._ready = true;
        this._initialized = false;
      }
    });
  };
}

if (!customElements.get('shader-doodle-camtex')) {
  customElements.define('shader-doodle-camtex', ShaderDoodleCamtex);
}
