const PIXEL = new Uint8Array([0, 0, 0, 255]);

class Texture {
  constructor(sd, opts = {}) {
    this._sd = sd;
    const { gl } = this._sd;

    this._textureObject = gl.createTexture();
    this._textureUnit = this._sd.usedTextureUnit++;
    this._bound = false;
    this._opts = {};

    this.update(
      Object.assign(
        {
          level: 0,
          internalFormat: gl.RGBA,
          offsetX: null,
          offsetY: null,
          width: 1,
          height: 1,
          border: 0,
          format: gl.RGBA,
          type: gl.UNSIGNED_BYTE,
          flipY: true,
          buffer: PIXEL,
          pixels: null,
        },
        typeof opts === 'object' ? opts : {}
      )
    );
  }

  _activate() {
    const { gl } = this._sd;
    if (gl.getParameter(gl.ACTIVE_TEXTURE) === this._textureUnit) return;
    gl.activeTexture(gl[`TEXTURE${this._textureUnit}`]);
  }

  _bind() {
    if (this._bound) return;
    const { gl } = this._sd;

    this._activate();
    gl.bindTexture(gl.TEXTURE_2D, this._textureObject);
    this._bound = true;
  }

  _unbind() {
    if (!this._bound) return;

    // TODO: Research - is this good/bad/extra overhead?
    // this._gl.bindTexture(this._gl.TEXTURE_2D, null);
    this._bound = false;
  }

  setParameters(params) {
    const { gl } = this._sd;
    this._activate();
    params.forEach(([p, val]) => {
      gl.texParameteri(gl.TEXTURE_2D, p, val);
    });
  }

  toUniform(location, opts) {
    if (!location) return;
    const { gl } = this._sd;

    this._bind();
    gl.uniform1i(location, this._textureUnit);
    this.update(opts);
    this._unbind();
  }

  update(opts) {
    if (typeof opts !== 'object') return;

    Object.assign(this._opts, opts);

    this._bind();

    const {
      _sd: { gl },
      _opts: {
        level,
        internalFormat,
        offsetX,
        offsetY,
        width,
        height,
        border,
        format,
        type,
        flipY,
        buffer,
        pixels,
      },
    } = this;

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);

    if (typeof offsetX === 'number' && typeof offsetY === 'number') {
      if (pixels) {
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          level,
          offsetX,
          offsetY,
          format,
          type,
          pixels
        );
      } else {
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          level,
          offsetX,
          offsetY,
          width,
          height,
          format,
          type,
          buffer
        );
      }
    } else {
      if (pixels) {
        gl.texImage2D(
          gl.TEXTURE_2D,
          level,
          internalFormat,
          format,
          type,
          pixels
        );
      } else {
        gl.texImage2D(
          gl.TEXTURE_2D,
          level,
          internalFormat,
          width,
          height,
          border,
          format,
          type,
          buffer
        );
      }
    }

    this._unbind();
  }

  destroy() {
    // TODO: Handle Texture Destroy
  }
}

export default Texture;
