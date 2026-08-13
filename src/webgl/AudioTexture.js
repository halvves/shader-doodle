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

// a media element can only ever be captured once, so source nodes are
// cached for reuse across mounts
const elementSources = new WeakMap();

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
  let disposed = false;

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
    // disposed while fetching/decoding
    if (disposed) return;
    source.loop = loop;
    source.start();
    isFile = true;
  }

  function setupAudioElement() {
    const audioElement = document.querySelector(src);
    if (!(audioElement instanceof HTMLAudioElement)) return;

    let entry = elementSources.get(audioElement);
    if (entry && entry.node.context !== wa) {
      console.warn(`src: ${src}: element belongs to a defunct audio context`);
      return;
    }
    if (!entry) {
      try {
        entry = {
          node: wa.createMediaElementSource(audioElement),
          refs: 0,
          direct: false,
        };
      } catch (e) {
        console.warn(`src: ${src}: element is already captured elsewhere`);
        return;
      }
      elementSources.set(audioElement, entry);
    }

    if (entry.direct) {
      entry.node.disconnect(wa.destination);
      entry.direct = false;
    }
    entry.refs++;
    element = audioElement;
    source = entry.node;
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
    if (disposed) return;
    disposed = true;

    if (source) {
      if (element) {
        // detach only our analyzer edge, the same node may feed other doodles
        source.disconnect(analyzer);
        const entry = elementSources.get(element);
        if (entry && --entry.refs === 0) {
          // a captured element only outputs through the graph, keep it audible
          source.connect(wa.destination);
          entry.direct = true;
        }
      } else {
        if (isFile) {
          try {
            source.stop();
          } catch (e) {
            // never started
          }
        }
        source.disconnect();
      }
    }
    analyzer.disconnect();
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
