const htmlDecode = input => {
  const doc = new DOMParser().parseFromString(input, "text/html");
  return doc.documentElement.textContent;
};

const DEFAULT_VS = `
attribute vec2 position;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
  :host {
    position: relative;
    display: inline-block;
    width: 250px;
    height: 250px;
  }
  :host > canvas {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    border-radius: inherit;
   }
</style>
`;

const SHADERTOY_IO = /\(\s*out\s+vec4\s+(\S+)\s*,\s*in\s+vec2\s+(\S+)\s*\)/;

class ShaderDoodle extends HTMLElement {
  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(TEMPLATE.content.cloneNode(true));
  }

  connectedCallback() {
    this.mounted = true;
    setTimeout(() => {
      if (!this.innerHTML.trim()) return false;
      try {
        this.init();
      } catch (e) {
        this.innerHTML = '';
        console.error(e && e.message || 'Error in shader-doodle.');
      }
    });
  }

  disconnectedCallback() {
    this.mounted = false;
    this.canvas.removeEventListener('mousedown', this.mouseDown);
    this.canvas.removeEventListener('mousemove', this.mouseMove);
    this.canvas.removeEventListener('mouseup', this.mouseUp);
    clearAnimationFrame(this.animationFrame);
  }

  init() {
    this.useST = this.hasAttribute('shadertoy');

    let fs = htmlDecode(this.innerHTML);

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

    this.canvas = document.createElement('canvas');
    this.shadow.appendChild(this.canvas);
    const gl = this.gl = this.canvas.getContext('webgl');
    this.updateRect();

    // format/replace special shadertoy io
    if (this.useST) {
      const io = fs.match(SHADERTOY_IO);
      fs = fs.replace('mainImage', 'main');
      fs = fs.replace(SHADERTOY_IO, '()');
      fs = (io ? `#define ${io[1]} gl_FragColor\n#define ${io[2]} gl_FragCoord.xy\n` : '') + fs;
    }

    const uniformString = Object
      .values(this.uniforms)
      .reduce((acc, uniform) => (acc + `uniform ${uniform.type} ${uniform.name};\n`), '');
    fs = uniformString + fs;
    fs = 'precision highp float;\n' + fs;

    gl.clearColor(0, 0, 0, 0);

    this.vertexShader = this.makeShader(gl.VERTEX_SHADER, DEFAULT_VS);
    this.fragmentShader = this.makeShader(gl.FRAGMENT_SHADER, fs);
    this.program = this.makeProgram(this.vertexShader, this.fragmentShader);

    this.vertices = new Float32Array([
      -1, 1, 1, 1, 1, -1,
      -1, 1, 1, -1, -1, -1,
    ]);

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    gl.useProgram(this.program);

    this.program.position = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(this.program.position);
    gl.vertexAttribPointer(this.program.position, 2, gl.FLOAT, false, 0, 0);

    // get all uniform locations from shaders
    Object.values(this.uniforms).forEach(uniform => {
      uniform.location = gl.getUniformLocation(this.program, uniform.name);
    });

    this._bind(
      'mouseDown',
      'mouseMove',
      'mouseUp',
      'render',
    );

    this.canvas.addEventListener('mousedown', this.mouseDown);
    this.canvas.addEventListener('mousemove', this.mouseMove);
    this.canvas.addEventListener('mouseup', this.mouseUp);

    this.render();
  }

  render(timestamp) {
    if (!this || !this.mounted || !this.gl) return;
    const { gl } = this;

    this.updateTimeUniforms(timestamp);
    this.updateRect();

    gl.clear(gl.COLOR_BUFFER_BIT);

    Object.values(this.uniforms).forEach(({ type, location, value }) => {
      const method = type.match(/vec/) ? `${type[type.length - 1]}fv` : `1${type[0]}`;
      gl[`uniform${method}`](location, value);
    });

    gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length / 2);

    this.ticking = false;
    this.animationFrame = requestAnimationFrame(this.render);
  }

  mouseDown(e) {
    if (this.useST) {
      this.mousedown = true;
      const { top, left } = this.canvas.getBoundingClientRect();
      this.uniforms.mouse.value[2] = e.clientX - left;
      this.uniforms.mouse.value[3] = e.clientY - top;
    }
  }

  mouseMove(e) {
    if (!this.ticking && (!this.useST || this.mousedown)) {
      const { top, left } = this.rect;
      this.uniforms.mouse.value[0] = e.clientX - Math.floor(left);
      this.uniforms.mouse.value[1] = e.clientY - Math.floor(top);
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
    const delta = this.lastTime ? ((timestamp - this.lastTime) / 1000) : 0;
    this.lastTime = timestamp;

    this.uniforms.time.value += delta;
    this.uniforms.delta.value = delta;
    this.uniforms.frame.value++;

    const d = new Date();
    this.uniforms.date.value[0] = d.getFullYear();
    this.uniforms.date.value[1] = d.getMonth() + 1;
    this.uniforms.date.value[2] = d.getDate();
    this.uniforms.date.value[3] = d.getHours() * 60 * 60 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() * 0.001;
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
    methods.forEach((method) => this[method] = this[method].bind(this));
  }
}

customElements.define('shader-doodle', ShaderDoodle);
