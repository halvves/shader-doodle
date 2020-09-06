import AudioContextResume from '../utils/AudioContextResume.js';
import DeviceOrientationManager from '../inputs/DeviceOrientationManager.js';

import Extensions from './Extensions.js';

import cheapClone from '../utils/cheapClone.js';

import { TIME, DELTA, DATE, FRAME, GLOBAL_UNIFORMS } from './constants.js';

function Renderer() {
  const canvas = document.createElementNS(
    'http://www.w3.org/1999/xhtml',
    'canvas'
  );
  const gl =
    canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  const deviceorientation = DeviceOrientationManager();
  const wa = new (window.AudioContext || window.webkitAudioContext)();
  const audioCtxResume = new AudioContextResume(wa);
  wa.onStart = audioCtxResume.onStart;

  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let animationFrame;
  let lastTime;

  let surfaces = new Set();

  const ustate = cheapClone(GLOBAL_UNIFORMS);
  /* TODO UNIFORM*/

  const extensions = Extensions(gl);
  extensions.get('OES_texture_float');
  extensions.get('OES_texture_float_linear');
  extensions.get('OES_texture_half_float');
  extensions.get('OES_texture_half_float_linear');

  function setSize(w, h) {
    if (w !== width) {
      width = w;
      canvas.width = Math.floor(width * pixelRatio);
    }

    if (h !== height) {
      height = h;
      canvas.height = Math.floor(height * pixelRatio);
    }
  }

  function updateSize(w, h) {
    if (w > width || h > height) {
      setSize(Math.max(w, width), Math.max(h, height));
    }
  }

  function updateTimeState(timestamp) {
    const delta = lastTime ? (timestamp - lastTime) / 1000 : 0;
    lastTime = timestamp;

    ustate[TIME].value += delta;
    ustate[DELTA].value = delta;
    ustate[FRAME].value++;

    const d = new Date();
    ustate[DATE].value[0] = d.getFullYear();
    ustate[DATE].value[1] = d.getMonth() + 1;
    ustate[DATE].value[2] = d.getDate();
    ustate[DATE].value[3] =
      d.getHours() * 60 * 60 +
      d.getMinutes() * 60 +
      d.getSeconds() +
      d.getMilliseconds() * 0.001;
  }

  function render(timestamp) {
    if (!surfaces.size) {
      animationFrame = undefined;
      return;
    }

    // TODO: handle pixelRatio?
    // const dpr = getDpr();
    // if (dpr !== getPixelRatio()) {
    //   setPixelRatio(dpr);
    // }

    updateTimeState(timestamp);

    const u = [...ustate, ...deviceorientation.ustate];
    surfaces.forEach(surface =>
      surface.render(canvas, updateSize, width, height, pixelRatio, u)
    );

    animationFrame = requestAnimationFrame(render);
  }

  function addSurface(surface) {
    audioCtxResume.register(surface.dom);
    surface.addClick(deviceorientation.setup);
    surfaces.add(surface);
    if (!animationFrame) {
      animationFrame = requestAnimationFrame(render);
    }
  }

  function removeSurface(surface) {
    surfaces.delete(surface);
  }

  function addUniform(name, value, type) {
    for (let i = 0; i < ustate.length; i++) {
      if (ustate[i].name === name) {
        ustate[i].value = value;
        ustate[i].type = type;
        return;
      }
    }
    ustate.push({
      name,
      value,
      type,
      toyname: name,
    });
  }

  function setUniform(name, value) {
    for (let i = 0; i < ustate.length; i++) {
      if (ustate[i].name === name) {
        ustate[i].value = value;
        break;
      }
    }
  }

  function dispose() {
    surfaces.forEach(s => s.dispose());
    surfaces.clear();
    surfaces = undefined;
    cancelAnimationFrame(animationFrame);
    deviceorientation.dispose();
    audioCtxResume.dispose();
    // TODO: any other cleanup??
  }

  // TODO: not sure if this is where i should actually handle clearColor()
  gl.clearColor(0, 0, 0, 0);

  return Object.freeze({
    get gl() {
      return gl;
    },
    get wa() {
      return wa;
    },
    addSurface,
    removeSurface,
    addUniform,
    setUniform,
    dispose,
  });
}

let singletonRenderer;
Renderer.singleton = function() {
  if (!singletonRenderer) {
    singletonRenderer = Renderer();
  }

  return singletonRenderer;
};

Renderer.resetSingleton = function() {
  if (singletonRenderer) singletonRenderer.dispose();
  singletonRenderer = Renderer();
};

export default Renderer;
