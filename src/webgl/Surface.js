import Program from './Program.js';

import cheapClone from '../utils/cheapClone.js';
import getMouseOrTouch from '../utils/getMouseOrTouch.js';

import { MOUSE, RESOLUTION, SURFACE_UNIFORMS } from './constants.js';

function Surface(element, program) {
  const canvas =
    element instanceof HTMLCanvasElement
      ? element
      : document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
  const ctx2d = canvas.getContext('2d');

  const clickCallbacks = new Set();
  const ustate = cheapClone(SURFACE_UNIFORMS);
  let rect = {};
  let visible;
  let ticking;
  let mousedown;

  function handleMouseDown(e) {
    clickCallbacks.forEach(cb => typeof cb === 'function' && cb());

    mousedown = true;
    const action = getMouseOrTouch(e);
    const { top, left, height } = rect;
    ustate[MOUSE].toyvalue[2] = action[0] - Math.floor(left);
    ustate[MOUSE].toyvalue[3] =
      Math.floor(height) - (action[1] - Math.floor(top));
  }

  function handleMouseMove(e) {
    if (!ticking) {
      const action = getMouseOrTouch(e);
      const { top, left, height } = rect;
      ustate[MOUSE].value[0] = action[0] - Math.floor(left);
      ustate[MOUSE].value[1] =
        Math.floor(height) - (action[1] - Math.floor(top));

      if (mousedown) {
        ustate[MOUSE].toyvalue[0] = ustate[MOUSE].value[0];
        ustate[MOUSE].toyvalue[1] = ustate[MOUSE].value[1];
      }

      ticking = true;
    }
  }

  function handleMouseUp(e) {
    mousedown = false;
    ustate[MOUSE].toyvalue[2] = 0;
    ustate[MOUSE].toyvalue[3] = 0;
  }

  function tick() {
    updateRect();
    ticking = false;
  }

  function updateRect() {
    const newRect = canvas.getBoundingClientRect();

    visible =
      newRect.top + newRect.height >= 0 &&
      newRect.left + newRect.width >= 0 &&
      newRect.bottom - newRect.height <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      newRect.right - newRect.width <=
        (window.innerWidth || document.documentElement.clientWidth);

    if (newRect.width !== rect.width) {
      canvas.width = ustate[RESOLUTION].value[0] = newRect.width;
    }

    if (newRect.height !== rect.height) {
      canvas.height = ustate[RESOLUTION].value[1] = newRect.height;
    }

    rect = newRect;
  }

  function render(
    rendererCanvas,
    updateRendererSize,
    rendererWidth,
    rendererHeight,
    pixelRatio,
    ustateArray
  ) {
    tick();
    if (!visible || !program) return;

    const width = rect.width || 0;
    const height = rect.height || 0;
    updateRendererSize(width, height);

    program.render(width, height, [...ustateArray, ...ustate]);

    // copy renderer to surface canvas
    const pixelWidth = width * pixelRatio;
    const pixelHeight = height * pixelRatio;
    ctx2d.clearRect(0, 0, pixelWidth, pixelHeight);
    ctx2d.drawImage(
      rendererCanvas,
      0,
      rendererHeight - pixelHeight,
      pixelWidth,
      pixelHeight,
      0,
      0,
      pixelWidth,
      pixelHeight
    );
  }

  function addClick(cb) {
    clickCallbacks.add(cb);
  }

  function dispose() {
    clickCallbacks.clear();
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseup', handleMouseUp);
    canvas.removeEventListener('mouseout', handleMouseUp);
    canvas.removeEventListener('touchstart', handleMouseDown);
    canvas.removeEventListener('touchmove', handleMouseMove);
    canvas.removeEventListener('touchend', handleMouseUp);
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseout', handleMouseUp);
  canvas.addEventListener('touchstart', handleMouseDown);
  canvas.addEventListener('touchmove', handleMouseMove);
  canvas.addEventListener('touchend', handleMouseUp);

  updateRect();
  return Object.freeze({
    get dom() {
      return canvas;
    },
    render,
    addClick,
    dispose,
  });
}

export default Surface;
