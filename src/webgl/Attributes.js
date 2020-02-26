export default function Attributes(gl, program) {
  const attributes = {};
  const n = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

  for (let i = 0; i < n; i++) {
    const { name } = gl.getActiveAttrib(program, i);
    attributes[name] = gl.getAttribLocation(program, name);
  }

  return attributes;
}
