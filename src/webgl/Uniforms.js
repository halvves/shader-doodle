import arraysEqual from '../utils/arraysEqual.js';
import copyArray from '../utils/copyArray.js';

const UNIFORM = 'uniform';

function setValueV1f(cache, location, gl, v) {
  if (cache[0] === v) return;
  gl.uniform1f(location, v);
  cache[0] = v;
}

function setValueV2f(cache, location, gl, v) {
  if (arraysEqual(cache, v)) return;
  gl.uniform2fv(location, v);
  copyArray(cache, v);
}

function setValueV3f(cache, location, gl, v) {
  if (arraysEqual(cache, v)) return;
  gl.uniform3fv(location, v);
  copyArray(cache, v);
}

function setValueV4f(cache, location, gl, v) {
  if (arraysEqual(cache, v)) return;
  gl.uniform4fv(location, v);
  copyArray(cache, v);
}

function setValueT1(cache, location, gl, v) {
  if (cache[0] !== v) {
    gl.uniform1i(location, v);
    cache[0] = v;
  }
}

function getUniformSetter(type) {
  switch (type) {
    case 0x1406: // FLOAT
      return setValueV1f;
    case 0x8b50: // FLOAT_VEC2
      return setValueV2f;
    case 0x8b51: // FLOAT_VEC3
      return setValueV3f;
    case 0x8b52: // FLOAT_VEC4
      return setValueV4f;

    case 0x8b5e: // SAMPLER_2D
    case 0x8d66: // SAMPLER_EXTERNAL_OES
      return setValueT1;
  }
}

function Uniform(gl, info, location) {
  const cache = [];
  const setter = getUniformSetter(info.type);

  function setValue(...params) {
    setter(cache, location, gl, ...params);
  }

  return {
    get location() {
      return location;
    },
    get name() {
      return info.name;
    },
    setValue,
  };
}

function Uniforms(gl, program) {
  const uniforms = {};
  const n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(program, i);
    const location = gl.getUniformLocation(program, info.name);
    const u = Uniform(gl, info, location);
    uniforms[u.name] = u;
  }

  return uniforms;
}

export default Uniforms;
