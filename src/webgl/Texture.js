import getSourceDimensions from '../utils/getSourceDimensions.js';

const PIXEL = new Uint8Array([0, 0, 0, 255]);

const isPow2 = value => !(value & (value - 1)) && !!value;
const floorPowerOfTwo = value => 2 ** Math.floor(Math.log(value) / Math.LN2);

export default function Texture(gl, textureUnit, optsParam = {}) {
  const TEXTURE_2D = gl.TEXTURE_2D;
  const textureObject = gl.createTexture();

  const options = {};
  const parameters = [];
  let px;
  let pow2canvas;

  function activate() {
    if (gl.getParameter(gl.ACTIVE_TEXTURE) === textureUnit) return;
    gl.activeTexture(gl[`TEXTURE${textureUnit}`]);
  }

  function bind() {
    activate();
    gl.bindTexture(TEXTURE_2D, textureObject);
  }

  function checkPow2() {
    const { pixels } = options;

    const wrapS = gl.getTexParameter(TEXTURE_2D, gl.TEXTURE_WRAP_S);
    const wrapT = gl.getTexParameter(TEXTURE_2D, gl.TEXTURE_WRAP_T);
    const minFilter = gl.getTexParameter(TEXTURE_2D, gl.TEXTURE_MIN_FILTER);

    const isPowerOf2 = isPow2(pixels.width) && isPow2(pixels.height);
    const needsPowerOfTwo =
      wrapS !== gl.CLAMP_TO_EDGE ||
      wrapT !== gl.CLAMP_TO_EDGE ||
      (minFilter !== gl.LINEAR && minFilter !== gl.NEAREST);

    if (needsPowerOfTwo && !isPowerOf2) {
      if (!pow2canvas) {
        pow2canvas = document.createElement('canvas');
        pow2canvas.width = floorPowerOfTwo(pixels.width);
        pow2canvas.height = floorPowerOfTwo(pixels.height);
        console.warn(
          `Texture is not power of two ${pixels.width} x ${pixels.height}. Resized to ${pow2canvas.width} x ${pow2canvas.height};`
        );
      }

      const ctx = pow2canvas.getContext('2d');
      ctx.drawImage(pixels, 0, 0, pow2canvas.width, pow2canvas.height);
    }

    px = (needsPowerOfTwo && pow2canvas) || pixels;
  }

  function setParameters(params) {
    activate();
    parameters.length = 0;
    params.forEach(p => {
      parameters.push(p);
      gl.texParameteri(TEXTURE_2D, p[0], p[1]);
    });
  }

  function updateParameters() {
    parameters.forEach(p => {
      gl.texParameteri(TEXTURE_2D, p[0], p[1]);
    });
  }

  function shallow() {
    bind();
    updateParameters();
  }

  function update(opts) {
    if (typeof opts !== 'object') return;

    Object.assign(options, opts);

    bind();

    const {
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
    } = options;

    updateParameters();

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);

    if (pixels) {
      const [w, h] = getSourceDimensions(pixels);
      if (w === 0 || h === 0) {
        console.warn(`Texture size is invalid ${w} x ${h}. Update is skipped;`);

        return;
      }

      checkPow2();
    }

    if (typeof offsetX === 'number' && typeof offsetY === 'number') {
      if (px) {
        gl.texSubImage2D(TEXTURE_2D, level, offsetX, offsetY, format, type, px);
      } else {
        gl.texSubImage2D(
          TEXTURE_2D,
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
      if (px) {
        gl.texImage2D(TEXTURE_2D, level, internalFormat, format, type, px);
      } else {
        gl.texImage2D(
          TEXTURE_2D,
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

    if (px && isPow2(px.width) && isPow2(px.height)) {
      const minFilter = gl.getTexParameter(TEXTURE_2D, gl.TEXTURE_MIN_FILTER);
      if (minFilter !== gl.LINEAR && minFilter !== gl.NEAREST) {
        gl.generateMipmap(TEXTURE_2D);
      }
    }
  }

  function dispose() {
    gl.deleteTexture(textureObject);
  }

  update(
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
      typeof optsParam === 'object' ? optsParam : {}
    )
  );

  return {
    setParameters,
    shallow,
    update,
    dispose,
  };
}
