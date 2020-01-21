import AudioContextResume from './AudioContextResume.js';
import Template from './template.js';
import SDBaseElement from './sd-base.js';
import './sd-audio.js';
import './sd-texture.js';

import bindMethods from './utils/bindMethods.js';
import getMouseOrTouch from './utils/getMouseOrTouch.js';

const SHADERTOY_IO = /\(\s*out\s+vec4\s+(\S+)\s*,\s*in\s+vec2\s+(\S+)\s*\)/;

class ShaderDoodleElement extends HTMLElement {
  constructor() {
    super();
    this._sd = {
      usedTextureUnit: 0,
    };
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this._sd.mounted = true;

    setTimeout(() => {
      try {
        this.init();
      } catch (e) {
        console.error((e && e.message) || 'Error in shader-doodle.');
      }
    });
  }

  disconnectedCallback() {
    this._sd.mounted = false;
    this._sd.canvas.removeEventListener('mousedown', this._handleMouseDown);
    this._sd.canvas.removeEventListener('mousemove', this._handleMouseMove);
    this._sd.canvas.removeEventListener('mouseup', this._handleMouseUp);
    window.removeEventListener(
      'deviceorientation',
      this._handleDeviceOrientation
    );
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

  findElements() {
    const elements = [];
    for (let c = 0; c < this.children.length; c++) {
      if (this.children[c] instanceof SDBaseElement) {
        elements.push(this.children[c]);
      }
    }
    return elements;
  }

  async init() {
    const shaders = await this.findShaders();
    const useST = (this._sd.useST = this.hasAttribute('shadertoy'));

    let fs = shaders.fragmentShader;
    let vs = shaders.vertexShader
      ? shaders.vertexShader
      : Template.defaultVertexShader();

    this.uniforms = {
      resolution: {
        name: useST ? 'iResolution' : 'u_resolution',
        type: 'vec2',
        value: [0, 0],
      },
      time: {
        name: useST ? 'iTime' : 'u_time',
        type: 'float',
        value: 0,
      },
      delta: {
        name: useST ? 'iTimeDelta' : 'u_delta',
        type: 'float',
        value: 0,
      },
      date: {
        name: useST ? 'iDate' : 'u_date',
        type: 'vec4',
        value: [0, 0, 0, 0],
      },
      frame: {
        name: useST ? 'iFrame' : 'u_frame',
        type: 'int',
        value: 0,
      },
      mouse: {
        name: useST ? 'iMouse' : 'u_mouse',
        type: useST ? 'vec4' : 'vec2',
        value: useST ? [0, 0, 0, 0] : [0, 0],
      },
      orientation: {
        name: useST ? 'iOrientation' : 'u_orientation',
        type: 'vec3',
        value: [0, 0, 0],
      },
    };
    this.shadow.innerHTML = Template.render();
    const canvas = (this._sd.canvas = Template.map(this.shadow).canvas);
    const gl = (this._sd.gl = canvas.getContext('webgl'));

    this._sd.wa = new (window.AudioContext || window.webkitAudioContext)();
    this._sd.wa.onStart = new AudioContextResume(this._sd.wa, canvas).onStart;

    this.updateRect();

    // format/replace special shadertoy io
    if (useST) {
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
    const program = (this._sd.program = this.makeProgram(
      this.vertexShader,
      this.fragmentShader
    ));

    // prettier-ignore
    this.vertices = new Float32Array([
      -1, 1, 1, 1, 1, -1,
      -1, 1, 1, -1, -1, -1,
    ]);

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    gl.useProgram(program);

    program.position = gl.getAttribLocation(program, 'position');

    this.elements = this.findElements();
    this.elements.forEach(e => {
      e.setup(this._sd);
    });
    gl.enableVertexAttribArray(program.position);
    gl.vertexAttribPointer(program.position, 2, gl.FLOAT, false, 0, 0);

    // get all uniform locations from shaders
    Object.values(this.uniforms).forEach(uniform => {
      uniform.location = gl.getUniformLocation(program, uniform.name);
    });

    bindMethods(
      this,
      '_handleDeviceOrientation',
      '_handleMouseDown',
      '_handleMouseMove',
      '_handleMouseUp',
      'render'
    );

    canvas.addEventListener('mousedown', this._handleMouseDown);
    canvas.addEventListener('mousemove', this._handleMouseMove);
    canvas.addEventListener('mouseup', this._handleMouseUp);
    canvas.addEventListener('mouseout', this._handleMouseUp);
    canvas.addEventListener('touchstart', this._handleMouseDown);
    canvas.addEventListener('touchmove', this._handleMouseMove);
    canvas.addEventListener('touchend', this._handleMouseUp);
    window.addEventListener('deviceorientation', this._handleDeviceOrientation);

    this.render();
  }

  render(timestamp) {
    if (!this || !this._sd.mounted || !this._sd.gl) return;
    const { gl } = this._sd;

    this.elements.forEach(e => {
      e.update();
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

  _setupDeviceOrientation() {
    this._sd.orientationRequested = true;
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(perms => {
          if (perms === 'granted') {
            window.addEventListener(
              'deviceorientation',
              this._handleDeviceOrientation
            );
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener(
        'deviceorientation',
        this._handleDeviceOrientation
      );
    }
  }

  _handleDeviceOrientation(e) {
    this.uniforms.orientation.value[0] = e.alpha;
    this.uniforms.orientation.value[1] = e.beta;
    this.uniforms.orientation.value[2] = e.gamma;
  }

  _handleMouseDown(e) {
    if (!this._sd.orientationRequested) {
      this._setupDeviceOrientation();
    }

    if (this._sd.useST) {
      this.mousedown = true;
      const action = getMouseOrTouch(e);
      const { top, left, height } = this.rect;
      this.uniforms.mouse.value[2] = action[0] - Math.floor(left);
      this.uniforms.mouse.value[3] =
        Math.floor(height) - (action[1] - Math.floor(top));
    }
  }

  _handleMouseMove(e) {
    if (!this.ticking && (!this._sd.useST || this.mousedown)) {
      const action = getMouseOrTouch(e);
      const { top, left, height } = this.rect;
      this.uniforms.mouse.value[0] = action[0] - Math.floor(left);
      this.uniforms.mouse.value[1] =
        Math.floor(height) - (action[1] - Math.floor(top));
      this.ticking = true;
    }
  }

  _handleMouseUp(e) {
    if (this._sd.useST) {
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
    this.rect = this._sd.canvas.getBoundingClientRect();
    const { width, height } = this.rect;
    const widthChanged = this._sd.canvas.width !== width;
    const heightChanged = this._sd.canvas.height !== height;

    if (widthChanged) {
      this._sd.canvas.width = this.uniforms.resolution.value[0] = width;
    }

    if (heightChanged) {
      this._sd.canvas.height = this.uniforms.resolution.value[1] = height;
    }

    if (widthChanged || heightChanged) {
      this._sd.gl.viewport(0, 0, this._sd.canvas.width, this._sd.canvas.height);
    }
  }

  makeShader(type, string) {
    const { gl } = this._sd;
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
    const { gl } = this._sd;
    const program = gl.createProgram();
    shaders.forEach(shader => {
      gl.attachShader(program, shader);
    });
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const linkLog = gl.getProgramInfoLog(program);
      console.warn(linkLog);
    }

    return program;
  }
}

if (!customElements.get('shader-doodle')) {
  customElements.define('shader-doodle', ShaderDoodleElement);
}
