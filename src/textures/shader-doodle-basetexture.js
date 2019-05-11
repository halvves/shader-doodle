export default class ShaderDoodleBaseTexture extends HTMLElement {
    static get observedAttributes() {
      return ['glindex'];
    }

    constructor() {
      super();
      this._backupTexture = new Uint8Array([0, 0, 0, 255]);
      this._height = 0;
      this._width = 0;
    }

    get width() {
      return this._width;
    }

    get height() {
      return this._height;
    }

    get shouldUpdate() {
      return false;
    }

    get isReady() {
      return true;
    }

    get glindex() {
      return this.getAttribute('glindex');
    }

    set glindex(val) {
      this.setAttribute('glindex', val)
    }

    init(gl, program) {
      if (!this.glindex) {
        this.glindex = 0;
      }

      let tex = this.isReady ? this.texture : this._backupTexture;
      this._gl = gl;
      this._program = program;
      this._glTex = gl.createTexture();

      const texCoordLocation = this._gl.getAttribLocation(this._program, 'a_texCoord');
      this._gl.enableVertexAttribArray(texCoordLocation);
      this._gl.vertexAttribPointer(texCoordLocation, 2, this._gl.FLOAT, false, 0, 0);

      const location = this._gl.getUniformLocation(this._program, 'u_image' + this.glindex);
      this._gl.uniform1i(location, this.glindex);
      this._gl.activeTexture(this._gl['TEXTURE' + this.glindex]);
      this._gl.bindTexture(this._gl.TEXTURE_2D, this._glTex);
      this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, this._gl.CLAMP_TO_EDGE);
      this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, this._gl.CLAMP_TO_EDGE);
      this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MIN_FILTER, this._gl.NEAREST);
      this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MAG_FILTER, this._gl.NEAREST);

      if (tex === this._backupTexture) {
        this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA, 1, 1, 0, this._gl.RGBA, this._gl.UNSIGNED_BYTE, tex);
      } else {
        this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA, this._gl.RGBA, this._gl.UNSIGNED_BYTE, tex);
      }

      this._initialized = true;
      this.update(gl, program);

      const rectCoords = new Float32Array([0, 0, this.width, 0, 0, this.height, 0,
        this.height, this.width, 0, this.width, this.height]);
      this._gl.bufferData(this._gl.ARRAY_BUFFER, rectCoords, this._gl.STATIC_DRAW);
    }

    update(gl, program) {
      if (!this._initialized) {
        this.init(gl, program);
        return;
      }

      if (this.shouldUpdate) {
        this._update();
      }
    }

    _update() {
      if (!this._initialized) { return; }
      this._gl.activeTexture(this._gl['TEXTURE' + this.glindex]);
      this._gl.bindTexture(this._gl.TEXTURE_2D, this._glTex);
      let tex = this.isReady ? this.texture : this._backupTexture;
      if (tex === this._backupTexture) {
        this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA, 1, 1, 0, this._gl.RGBA, this._gl.UNSIGNED_BYTE, tex);
      } else {
        this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA, this._gl.RGBA, this._gl.UNSIGNED_BYTE, tex);
      }
    }
}
