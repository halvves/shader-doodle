import Template from './template.js';
import Texture from './sd-texture.js';

const SHADERTOY_IO = /\(\s*out\s+vec4\s+(\S+)\s*,\s*in\s+vec2\s+(\S+)\s*\)/;
const UNNAMED_TEXTURE_PREFIX = 'u_texture_';

class ShaderDoodle extends HTMLElement {
  constructor() {
    super();
    this.unnamedTextureIndex = 0;
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.mounted = true;

    setTimeout(() => {
      try {
        this.init();
      } catch (e) {
        console.error((e && e.message) || 'Error in shader-doodle.');
      }
    });
  }

  disconnectedCallback() {
    this.mounted = false;
    this.canvas.removeEventListener('mousedown', this.mouseDown);
    this.canvas.removeEventListener('mousemove', this.mouseMove);
    this.canvas.removeEventListener('mouseup', this.mouseUp);
    cancelAnimationFrame(this.animationFrame);
  }

  loadTextFromUrl(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status === 200) {
            resolve(xhr.responseText);
          } else {
            reject(xhr.status);
          }
        }
      };
      xhr.send();
    });
  }

  async getScriptContent(script) {
    if (script.src) {
      return this.loadTextFromUrl(script.src);
    }

    return script.text;
  }

  async findShaders() {
    const shdrs = {};
    for (let i = 0; i < this.children.length; i++) {
      const c = this.children[i];
      switch (c.getAttribute('type')) {
        case 'x-shader/x-fragment':
          shdrs.fragmentShader = await this.getScriptContent(c);
          break;

        case 'x-shader/x-vertex':
          shdrs.vertexShader = await this.getScriptContent(c);
          break;
      }
    }
    return shdrs;
  }

  findTextures() {
    const textures = [];
    for (let c = 0; c < this.children.length; c++) {
      if (this.children[c] instanceof Texture) {
        textures.push(this.children[c]);
      }
    }
    return textures;
  }

  async init() {
    const shaders = await this.findShaders();
    this.useST = this.hasAttribute('shadertoy');

    let fs = shaders.fragmentShader;
    let vs = shaders.vertexShader
      ? shaders.vertexShader
      : Template.defaultVertexShader();

    this.uniforms = {
      resolution: {
        name: this.useST ? 'iResolution' : 'u_resolution',
        type: 'vec2',
        value: [0, 0],
      },
      time: {
        name: this.useST ? 'iTime' : 'u_time',
        type: 'float',
        value: 0,
      },
      delta: {
        name: this.useST ? 'iTimeDelta' : 'u_delta',
        type: 'float',
        value: 0,
      },
      date: {
        name: this.useST ? 'iDate' : 'u_date',
        type: 'vec4',
        value: [0, 0, 0, 0],
      },
      frame: {
        name: this.useST ? 'iFrame' : 'u_frame',
        type: 'int',
        value: 0,
      },
      mouse: {
        name: this.useST ? 'iMouse' : 'u_mouse',
        type: this.useST ? 'vec4' : 'vec2',
        value: this.useST ? [0, 0, 0, 0] : [0, 0],
      },
    };
    this.shadow.innerHTML = Template.render();
    this.canvas = Template.map(this.shadow).canvas;
    const gl = (this.gl = this.canvas.getContext('webgl'));
    this.updateRect();

    // format/replace special shadertoy io
    if (this.useST) {
      const io = fs.match(SHADERTOY_IO);
      fs = fs.replace('mainImage', 'main');
      fs = fs.replace(SHADERTOY_IO, '()');
      fs =
        (io
          ? `#define ${io[1]} gl_FragColor\n#define ${io[2]} gl_FragCoord.xy\n`
          : '') + fs;
    }

    const uniformString = Object.values(this.uniforms).reduce(
      (acc, uniform) => acc + `uniform ${uniform.type} ${uniform.name};\n`,
      ''
    );
    fs = uniformString + fs;
    fs = 'precision highp float;\n' + fs;

    gl.clearColor(0, 0, 0, 0);

    this.vertexShader = this.makeShader(gl.VERTEX_SHADER, vs);
    this.fragmentShader = this.makeShader(gl.FRAGMENT_SHADER, fs);
    this.program = this.makeProgram(this.vertexShader, this.fragmentShader);

    // prettier-ignore
    this.vertices = new Float32Array([
      -1, 1, 1, 1, 1, -1,
      -1, 1, 1, -1, -1, -1,
    ]);

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    gl.useProgram(this.program);

    this.program.position = gl.getAttribLocation(this.program, 'position');

    this.textures = this.findTextures();
    this.textures.forEach((t, i) => {
      // set texture name to 'u_texture_XX' if no name set
      if (!t.name) {
        t.name = `${UNNAMED_TEXTURE_PREFIX}${this.unnamedTextureIndex++}`;
      }
      t.init(gl, this.program, i);
    });
    gl.enableVertexAttribArray(this.program.position);
    gl.vertexAttribPointer(this.program.position, 2, gl.FLOAT, false, 0, 0);

    // get all uniform locations from shaders
    Object.values(this.uniforms).forEach(uniform => {
      uniform.location = gl.getUniformLocation(this.program, uniform.name);
    });

    this._bind('mouseDown', 'mouseMove', 'mouseUp', 'render');

    this.canvas.addEventListener('mousedown', this.mouseDown);
    this.canvas.addEventListener('mousemove', this.mouseMove);
    this.canvas.addEventListener('mouseup', this.mouseUp);

    this.render();
  }

  render(timestamp) {
    if (!this || !this.mounted || !this.gl) return;
    const { gl } = this;

    this.textures.forEach(t => {
      t.update();
    });

    this.updateTimeUniforms(timestamp);
    this.updateRect();

    gl.clear(gl.COLOR_BUFFER_BIT);

    Object.values(this.uniforms).forEach(({ type, location, value }) => {
      const method = type.match(/vec/)
        ? `${type[type.length - 1]}fv`
        : `1${type[0]}`;
      gl[`uniform${method}`](location, value);
    });

    gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length / 2);

    this.ticking = false;
    this.animationFrame = requestAnimationFrame(this.render);
  }

  mouseDown(e) {
    if (this.useST) {
      this.mousedown = true;
      const { top, left, height } = this.rect;
      this.uniforms.mouse.value[2] = e.clientX - Math.floor(left);
      this.uniforms.mouse.value[3] =
        Math.floor(height) - (e.clientY - Math.floor(top));
    }
  }

  mouseMove(e) {
    if (!this.ticking && (!this.useST || this.mousedown)) {
      const { top, left, height } = this.rect;
      this.uniforms.mouse.value[0] = e.clientX - Math.floor(left);
      this.uniforms.mouse.value[1] =
        Math.floor(height) - (e.clientY - Math.floor(top));
      this.ticking = true;
    }
  }

  mouseUp(e) {
    if (this.useST) {
      this.mousedown = false;
      this.uniforms.mouse.value[2] = 0;
      this.uniforms.mouse.value[3] = 0;
    }
  }

  updateTimeUniforms(timestamp) {
    const delta = this.lastTime ? (timestamp - this.lastTime) / 1000 : 0;
    this.lastTime = timestamp;

    this.uniforms.time.value += delta;
    this.uniforms.delta.value = delta;
    this.uniforms.frame.value++;

    const d = new Date();
    this.uniforms.date.value[0] = d.getFullYear();
    this.uniforms.date.value[1] = d.getMonth() + 1;
    this.uniforms.date.value[2] = d.getDate();
    this.uniforms.date.value[3] =
      d.getHours() * 60 * 60 +
      d.getMinutes() * 60 +
      d.getSeconds() +
      d.getMilliseconds() * 0.001;
  }

  updateRect() {
    this.rect = this.canvas.getBoundingClientRect();
    const { width, height } = this.rect;
    const widthChanged = this.canvas.width !== width;
    const heightChanged = this.canvas.height !== height;

    if (widthChanged) {
      this.canvas.width = this.uniforms.resolution.value[0] = width;
    }

    if (heightChanged) {
      this.canvas.height = this.uniforms.resolution.value[1] = height;
    }

    if (widthChanged || heightChanged) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  makeShader(type, string) {
    const { gl } = this;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, string);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const compilationLog = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      console.warn(compilationLog, '\nin shader:\n', string);
    }

    return shader;
  }

  makeProgram(...shaders) {
    const { gl } = this;
    const program = gl.createProgram();
    shaders.forEach(shader => {
      gl.attachShader(program, shader);
    });
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const linkLog = gl.getProgramInfoLog(this.program);
      console.warn(linkLog);
    }

    return program;
  }

  _bind(...methods) {
    methods.forEach(method => (this[method] = this[method].bind(this)));
  }
}

if (!customElements.get('shader-doodle')) {
  customElements.define('shader-doodle', ShaderDoodle);
}
