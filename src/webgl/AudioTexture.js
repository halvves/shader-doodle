import Texture from './Texture.js';

function asyncFetchAudioBuffer(url) {
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

function asyncDecodeAudioBuffer(buf, wa) {
  return new Promise((resolve, reject) => {
    wa.decodeAudioData(buf, resolve, reject);
  });
}

function AudioTexture(
  renderer,
  textureUnit,
  name,
  src,
  mic,
  loop,
  autoplay,
  crossOrigin
) {
  const gl = renderer.gl;
  const wa = renderer.wa;

  const analyzer = wa.createAnalyser();
  analyzer.fftSize = 1024;

  const freqData = new Uint8Array(analyzer.frequencyBinCount);
  const waveData = new Uint8Array(analyzer.frequencyBinCount);

  const texture = Texture(gl, textureUnit, {
    internalFormat: gl.LUMINANCE,
    width: waveData.length,
    height: 2,
    format: gl.LUMINANCE,
    buffer: null,
  });
  texture.setParameters([
    [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
    [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
    [gl.TEXTURE_MIN_FILTER, gl.NEAREST],
  ]);

  let element;
  let source;
  let isFile = false;

  const ustate = [
    {
      name,
      value: textureUnit,
    },
  ];

  /* TODO: maybe re-instate when the ios13 issue has answers
  function setupAudioFile() {
    element = new Audio();
    element.loop = loop;
    element.autoplay = autoplay;
    element.crossOrigin = crossOrigin;
    element.src = src;
    source = wa.createMediaElementSource(element);
    element.load();

    if (autoplay) {
      wa.onStart(() => element.play());
    }
  } */

  /* i don't like it but its the only way to get this working in ios13 */
  async function setupAudioFile() {
    source = wa.createBufferSource();
    source.buffer = await asyncDecodeAudioBuffer(
      await asyncFetchAudioBuffer(src),
      wa
    );
    source.loop = loop;
    source.start();
    isFile = true;
  }

  function setupAudioElement() {
    const audioElement = document.querySelector(src);
    if (audioElement && audioElement instanceof HTMLAudioElement) {
      element = audioElement;
      source = wa.createMediaElementSource(audioElement);
    }
  }

  function analyze(source, destination) {
    source.connect(analyzer);
    analyzer.connect(destination);
  }

  function shouldUpdate() {
    return (
      isFile ||
      (element &&
        element.readyState > 2 &&
        !element.paused &&
        !element.ended &&
        element.currentTime)
    );
  }

  function update(updateSingleUniform) {
    ustate.forEach(updateSingleUniform);

    if (shouldUpdate()) {
      analyzer.getByteFrequencyData(freqData);
      analyzer.getByteTimeDomainData(waveData);
      texture.update({
        offsetX: 0,
        offsetY: 0,
        height: 1,
        buffer: freqData,
      });
      texture.update({
        offsetX: 0,
        offsetY: 1,
        height: 1,
        buffer: waveData,
      });
    }
  }

  function dispose() {
    texture.dispose();
  }

  // TODO: mic support
  /* if (mic) {
    setupMic();
  } else */ if (src[0] === '#') {
    setupAudioElement();
  } else if (src) {
    setupAudioFile();
  }

  if (source) {
    analyze(source, wa.destination);
  }

  return {
    dispose,
    update,
  };
}

export default AudioTexture;
