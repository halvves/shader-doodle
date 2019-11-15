const PIXEL = new Uint8Array([0, 0, 0, 255]);

const isPow2 = value => !(value & (value - 1)) && !!value;
const floorPowerOfTwo = value => 2 ** Math.floor(Math.log(value) / Math.LN2);

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

  _checkPow2() {
    const {
      _sd: { gl },
      _opts: { pixels },
    } = this;

    const wrapS = gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S);
    const wrapT = gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T);
    const minFilter = gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER);

    const isPowerOf2 = isPow2(pixels.width) && isPow2(pixels.height);
    const needsPowerOfTwo =
      wrapS !== gl.CLAMP_TO_EDGE ||
      wrapT !== gl.CLAMP_TO_EDGE ||
      (minFilter !== gl.LINEAR && minFilter !== gl.NEAREST);

    if (needsPowerOfTwo && !isPowerOf2) {
      if (!this._pow2canvas) {
        this._pow2canvas = document.createElement('canvas');
        this._pow2canvas.width = floorPowerOfTwo(pixels.width);
        this._pow2canvas.height = floorPowerOfTwo(pixels.height);
        console.warn(
          `Texture is not power of two ${pixels.width} x ${pixels.height}. Resized to ${this._pow2canvas.width} x ${this._pow2canvas.height};`
        );
      }

      const ctx = this._pow2canvas.getContext('2d');
      ctx.drawImage(
        pixels,
        0,
        0,
        this._pow2canvas.width,
        this._pow2canvas.height
      );
    }

    this._px = this._pow2canvas || pixels;
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

    if (pixels) {
      this._checkPow2();
    }

    if (typeof offsetX === 'number' && typeof offsetY === 'number') {
      if (this._px) {
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          level,
          offsetX,
          offsetY,
          format,
          type,
          this._px
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
      if (this._px) {
        gl.texImage2D(
          gl.TEXTURE_2D,
          level,
          internalFormat,
          format,
          type,
          this._px
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

    if (this._px && isPow2(this._px.width) && isPow2(this._px.height)) {
      const minFilter = gl.getTexParameter(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER
      );
      if (minFilter !== gl.LINEAR && minFilter !== gl.NEAREST) {
        gl.generateMipmap(gl.TEXTURE_2D);
      }
    }

    this._unbind();
  }

  destroy() {
    // TODO: Handle Texture Destroy
  }
}

export default Texture;
