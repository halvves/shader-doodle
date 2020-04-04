import { ORIENTATION, ORIENTATION_UNIFORMS } from '../webgl/constants.js';

import cheapClone from '../utils/cheapClone.js';

function DeviceOrientation() {
  let orientationRequested = false;

  const ustate = cheapClone(ORIENTATION_UNIFORMS);

  function setup() {
    if (orientationRequested) return;
    orientationRequested = true;

    if (
      typeof DeviceOrientationEvent === 'object' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      DeviceOrientationEvent.requestPermission()
        .then(perms => {
          if (perms === 'granted') {
            window.addEventListener(
              'deviceorientation',
              handleDeviceOrientation
            );
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('deviceorientation', handleDeviceOrientation);
    }
  }

  function handleDeviceOrientation(e) {
    ustate[ORIENTATION].value[0] = e.alpha;
    ustate[ORIENTATION].value[1] = e.beta;
    ustate[ORIENTATION].value[2] = e.gamma;
  }

  function dispose() {
    window.removeEventListener('deviceorientation', handleDeviceOrientation);
  }

  return {
    get ustate() {
      return ustate;
    },
    setup,
    dispose,
  };
}

export default DeviceOrientation;
