export default function Shader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  // log shader errors
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const compilationLog = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    console.warn(compilationLog, '\nin shader:\n', source);
  }

  return shader;
}
