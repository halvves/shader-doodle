import Texture from './Texture.js';
import getSourceDimensions from '../utils/getSourceDimensions.js';
import { ShaderDoodleElement } from '../shader-doodle.js';

const IMAGE = 0;
const VIDEO = 1;
const CAMERA = 2;
const CANVAS = 3;

const IMG_REG = /\w+\.(jpg|jpeg|png|gif|bmp)(?=\?|$)/i;
const isImage = s => IMG_REG.test(s);
const VID_REG = /\w+\.(mp4|3gp|webm|ogv)(?=\?|$)/i;
const isVideo = s => VID_REG.test(s);

function addHiddenInDOM(video) {
  const wrapper = document.createElement('div');
  wrapper.style.width = wrapper.style.height = '1px';
  wrapper.style.overflow = 'hidden';
  wrapper.style.position = 'absolute';
  wrapper.style.opacity = '0';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.zIndex = '-1000';
  wrapper.appendChild(video);
  document.body.appendChild(wrapper);
}

export default function GeneralTexture(
  renderer,
  textureUnit,
  name,
  src,
  webcam,
  wrapS,
  wrapT,
  minFilter,
  magFilter,
  forceUpdate
) {
  const gl = renderer.gl;
  const texture = Texture(gl, textureUnit);

  let source;
  let type;

  const ustate = [
    {
      name,
      value: textureUnit,
    },
    {
      name: name + '_resolution',
      value: [0, 0],
    },
  ];

  function setupElementReference() {
    try {
      source = document.querySelector(src);
    } catch (e) {
      console.warn(`src: ${src}: invalid selector`);
    }

    if (!source) {
      console.warn(`src: ${src}: no element could be selected`);
      return;
    }

    if (source instanceof HTMLImageElement) {
      type = IMAGE;
      if (source.complete) {
        imageOnload();
      } else {
        source.addEventListener('load', imageOnload);
      }
    } else if (source instanceof HTMLVideoElement) {
      type = VIDEO;
    } else if (source instanceof HTMLCanvasElement) {
      type = CANVAS;
      imageOnload();
    } else if (source instanceof ShaderDoodleElement) {
      source = source.surface.dom;
      type = CANVAS;
      imageOnload();
    } else {
      console.warn(`src: ${src}: element is not a valid texture source`);
    }
  }

  function setupImage() {
    type = IMAGE;
    source = new Image();
    source.crossOrigin = 'anonymous';
    source.onload = imageOnload;
    source.onerror = () => {
      console.warn(`failed loading src: ${src}`);
    };
    source.src = src;
  }

  function imageOnload() {
    updateResolution();
    texture.setParameters([
      [gl.TEXTURE_WRAP_S, wrapS],
      [gl.TEXTURE_WRAP_T, wrapT],
      [gl.TEXTURE_MIN_FILTER, minFilter],
      [gl.TEXTURE_MAG_FILTER, magFilter],
    ]);
    texture.update({ pixels: source });
  }

  function setupVideo() {
    type = VIDEO;
    source = document.createElement('video');

    source.autoplay = true;
    source.muted = true;
    source.loop = true;
    source.playsInline = true;
    source.crossOrigin = 'anonymous';
    source.src = src;
    addHiddenInDOM(source);
    source.play();
  }

  let hasVideoSetup = false;
  function videoOnSetup() {
    if (hasVideoSetup) return;
    hasVideoSetup = true;
    updateResolution();
    texture.setParameters([
      [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
      [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
      [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
    ]);
  }

  function setupCamera() {
    type = CAMERA;
    const getUserMedia =
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia;

    const start = stream => {
      source = document.createElement('video');
      source.width = 320;
      source.height = 240;
      source.autoplay = true;
      source.srcObject = stream;
      addHiddenInDOM(source);
    };

    const initCam = () => {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(start)
        .catch(e => console.log(e.name + ': ' + e.message));
    };

    const initCamLegacy = () => {
      getUserMedia({ video: true }, start, e => e);
    };

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      initCam();
    } else if (getUserMedia) {
      initCamLegacy();
    }
  }

  function updateResolution() {
    if (source) {
      const [w, h] = getSourceDimensions(source);
      ustate[1].value[0] = w;
      ustate[1].value[1] = h;
    }
  }

  function isSourceVideo() {
    return (
      (type === CAMERA || type === VIDEO) && source instanceof HTMLVideoElement
    );
  }

  function shouldUpdate() {
    return (
      forceUpdate ||
      (isSourceVideo() && source.readyState === source.HAVE_ENOUGH_DATA)
    );
  }

  function update(updateSingleUniform) {
    ustate.forEach(updateSingleUniform);

    if (shouldUpdate()) {
      if (isSourceVideo()) videoOnSetup();
      texture.update({ pixels: source });
    } else {
      texture.shallow();
    }
  }

  function dispose() {
    texture.dispose();
  }

  // init
  if (webcam) {
    setupCamera();
  } else if (isVideo(src)) {
    setupVideo();
  } else if (isImage(src)) {
    setupImage();
  } else {
    setupElementReference();
  }

  return {
    dispose,
    update,
  };
}
