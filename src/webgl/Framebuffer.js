export default function Framebuffer(gl) {
  let width;
  let height;

  const handle = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, handle);

  const texture = gl.createTexture();
  if (!texture) throw new Error('createTexture returned null');

  gl.bindTexture(gl.TEXTURE_2D, texture);
  updateTexture(true);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0
  );

  function bind() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, handle);
    gl.viewport(0, 0, width, height);
  }

  // TODO... tempfix??? something better here
  function updateTexture(init) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      init ? gl.NEAREST : gl.LINEAR
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      init ? gl.NEAREST : gl.LINEAR
    );
  }

  function updateResolution(w, h) {
    if (w !== width || h !== height) {
      width = w;
      height = h;

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        w,
        h,
        0,
        gl.RGBA,
        gl.FLOAT,
        null
      );
    }
  }

  function dispose() {
    gl.deleteFramebuffer(handle);
    gl.deleteTexture(texture);
  }

  return {
    get handle() {
      return handle;
    },
    get texture() {
      return texture;
    },
    updateTexture,
    bind,
    updateResolution,
    dispose,
  };
}
