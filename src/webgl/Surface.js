import Program from './Program.js';

import cheapClone from '../utils/cheapClone.js';
import getMouseOrTouch from '../utils/getMouseOrTouch.js';

import { MOUSE, MOUSEDRAG, RESOLUTION, SURFACE_UNIFORMS } from './constants.js';

function Surface(element, program, sdNode) {
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
    ustate[MOUSEDRAG].value[0] = ustate[MOUSEDRAG].value[2] =
      action[0] - Math.floor(left);
    ustate[MOUSEDRAG].value[1] = ustate[MOUSEDRAG].value[3] =
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
        ustate[MOUSEDRAG].value[0] = ustate[MOUSE].value[0];
        ustate[MOUSEDRAG].value[1] = ustate[MOUSE].value[1];
      }

      ticking = true;
    }
  }

  function handleMouseUp(e) {
    mousedown = false;
    if (Math.sign(ustate[MOUSEDRAG].value[2]) === 1) {
      ustate[MOUSEDRAG].value[2] *= -1;
    }
    if (Math.sign(ustate[MOUSEDRAG].value[3]) === 1) {
      ustate[MOUSEDRAG].value[3] *= -1;
    }
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

    const h =
      sdNode.forcedHeight && sdNode.forcedHeight > 0
        ? sdNode.forcedHeight
        : newRect.height;
    const w =
      sdNode.forcedWidth && sdNode.forcedWidth > 0
        ? sdNode.forcedWidth
        : newRect.width;

    if (w !== rect.width) {
      canvas.width = ustate[RESOLUTION].value[0] = w;
    }

    if (h !== rect.height) {
      canvas.height = ustate[RESOLUTION].value[1] = h;
    }

    rect = { width: canvas.width, height: canvas.height };
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
