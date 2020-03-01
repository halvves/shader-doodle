export const TIME = 0;
export const DELTA = 1;
export const DATE = 2;
export const FRAME = 3;
export const GLOBAL_UNIFORMS = [
  {
    name: 'u_time',
    toyname: 'iTime',
    type: 'float',
    value: 0,
  },
  {
    name: 'u_delta',
    toyname: 'iTimeDelta',
    type: 'float',
    value: 0,
  },
  {
    name: 'u_date',
    toyname: 'iDate',
    type: 'vec4',
    value: [0, 0, 0, 0],
  },
  {
    name: 'u_frame',
    toyname: 'iFrame',
    type: 'int',
    value: 0,
  },
];

export const RESOLUTION = 0;
export const MOUSE = 1;
export const SURFACE_UNIFORMS = [
  {
    name: 'u_resolution',
    toyname: 'iResolution',
    type: 'vec2',
    value: [0, 0],
  },
  {
    name: 'u_mouse',
    toyname: 'iMouse',
    type: 'vec2',
    toytype: 'vec4',
    value: [0, 0],
    toyvalue: [0, 0, 0, 0],
  },
];

export const ORIENTATION = 0;
export const ORIENTATION_UNIFORMS = [
  {
    name: 'u_orientation',
    toyname: 'iOrientation',
    type: 'vec3',
    value: [0, 0, 0],
  },
];

export const BASE_UNIFORM_ARRAY = [
  ...GLOBAL_UNIFORMS,
  ...ORIENTATION_UNIFORMS,
  ...SURFACE_UNIFORMS,
];

export const SHADERTOY_IO = /\(\s*out\s+vec4\s+(\S+)\s*,\s*in\s+vec2\s+(\S+)\s*\)/;
