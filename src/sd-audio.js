import SDBaseElement from './sd-base.js';
import Texture from './Texture.js';

const UNNAMED_AUDIO_PREFIX = 'u_audio';
let unnamedAudioIndex = 0;

class SDAudioElement extends SDBaseElement {
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

  get shouldUpdate() {
    const { _audioElement: elem } = this;

    return (
      this._isFile ||
      (elem &&
        elem.readyState > 2 &&
        !elem.paused &&
        !elem.ended &&
        elem.currentTime)
    );
  }

  init() {
    const { gl, program, wa } = this._sd;

    if (!this.name) {
      this.name = `${UNNAMED_AUDIO_PREFIX}${unnamedAudioIndex++}`;
    }

    this._analyzer = wa.createAnalyser();
    this._analyzer.fftSize = 1024;
    this._freqData = new Uint8Array(this._analyzer.frequencyBinCount);
    this._waveData = new Uint8Array(this._analyzer.frequencyBinCount);

    this._location = gl.getUniformLocation(program, this.name);

    this._texture = new Texture(this._sd, {
      internalFormat: gl.LUMINANCE,
      width: this._waveData.length,
      height: 2,
      format: gl.LUMINANCE,
      buffer: null,
    });
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // TODO: mic support
    /* if (this.mic) {
      this._setupMic();
    } else */ if (
      this.src[0] === '#'
    ) {
      this._setupAudioElement();
    } else if (this.src) {
      this._setupAudioFile();
    }

    if (this._source) {
      this.analyze(this._source, wa.destination);
    }
  }

  update() {
    const { gl } = this._sd;
    if (this.shouldUpdate) {
      this._analyzer.getByteFrequencyData(this._freqData);
      this._analyzer.getByteTimeDomainData(this._waveData);
      this._texture.update({
        offsetX: 0,
        offsetY: 0,
        height: 1,
        buffer: this._freqData,
      });
      this._texture.update({
        offsetX: 0,
        offsetY: 1,
        height: 1,
        buffer: this._waveData,
      });
    }

    this._texture.toUniform(this._location);
  }

  analyze(source, destination) {
    source.connect(this._analyzer);
    this._analyzer.connect(destination);
  }

  _setupAudioElement() {
    const { wa } = this._sd;
    const audioElement = document.querySelector(this.src);
    if (audioElement && audioElement instanceof HTMLAudioElement) {
      this._audioElement = audioElement;
      this._source = wa.createMediaElementSource(audioElement);
    }
  }

  /* TODO: maybe re-instate when the ios13 issue has answers
  _setupAudioFile() {
    const { canvas, wa } = this._sd;
    const audio = (this._audioElement = new Audio());
    audio.loop = this.loop;
    audio.autoplay = this.autoplay;
    audio.crossOrigin = this.crossOrigin;
    audio.src = this.src;
    this._source = wa.createMediaElementSource(audio);
    audio.load();

    if (this.autoplay) {
      wa.onStart(() => audio.play());
    }
  }
  */

  /* i don't like it but its the only way to get this working in ios13 */
  async _setupAudioFile() {
    const { wa } = this._sd;
    this._source = wa.createBufferSource();
    this._source.buffer = await this._decodeAudioBuffer(
      await this._fetchAudioBuffer(this.src)
    );
    this._source.loop = this.loop;
    this._source.start();
    this._isFile = true;
  }

  _fetchAudioBuffer(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status === 200 || xhr.status === 206) {
            resolve(xhr.response);
          } else {
            console.log(xhr);
            reject(xhr.status);
          }
        }
      };
      xhr.send();
    });
  }

  _decodeAudioBuffer(buf) {
    const { wa } = this._sd;
    return new Promise((resolve, reject) => {
      wa.decodeAudioData(buf, resolve, reject);
    });
  }
}

if (!customElements.get('sd-audio')) {
  customElements.define('sd-audio', SDAudioElement);
}
