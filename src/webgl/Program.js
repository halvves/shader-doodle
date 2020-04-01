import Attributes from './Attributes.js';
import Framebuffer from './Framebuffer.js';
import Shader from './Shader.js';
import Uniforms from './Uniforms.js';

import createUniformString from './createUniformString.js';
import resolveToy from './resolveToy.js';

import { BASE_UNIFORM_ARRAY, SHADERTOY_IO } from './constants.js';

let currentProgramId = 0;

function prepareFragShader(fs, shadertoy) {
  // format/replace special shadertoy io
  if (shadertoy) {
    const io = fs.match(SHADERTOY_IO);
    fs = fs.replace('mainImage', 'main');
    fs = fs.replace(SHADERTOY_IO, '()');
    fs =
      (io
        ? `#define ${io[1]} gl_FragColor\n#define ${io[2]} gl_FragCoord.xy\n`
        : '') + fs;
  }

  // prepend fs string with uniforms and precision
  fs = createUniformString(BASE_UNIFORM_ARRAY, shadertoy) + fs;
  fs = 'precision highp float;\n' + fs;

  return fs;
}

export default function Program(gl, vs, fs, vertices, shadertoy = false) {
  const id = currentProgramId++;

  const program = gl.createProgram();
  const vertexBuffer = gl.createBuffer();

  const vertexShader = Shader(gl, gl.VERTEX_SHADER, vs);
  const fragmentShader = Shader(
    gl,
    gl.FRAGMENT_SHADER,
    prepareFragShader(fs, shadertoy)
  );

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  let name;
  let unit;
  let framebuffer;
  let prevbuffer;
  let prevbufferUnit;
  const attributes = Attributes(gl, program);
  const uniforms = Uniforms(gl, program);

  const nodes = new Set();
  const textures = new Set();
  let textureUnit = 0;

  // log program errors
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const linkLog = gl.getProgramInfoLog(program);
    console.warn(linkLog);
  }

  // cleanup
  gl.detachShader(program, vertexShader);
  gl.detachShader(program, fragmentShader);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  // TODO: where/when to better handle vertices
  const verticesLocation = attributes.position;
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(verticesLocation);
  gl.vertexAttribPointer(verticesLocation, 2, gl.FLOAT, false, 0, 0);

  function addNode(node, name, usePrev) {
    node.toFbo(name, getTexUnit(), usePrev);
    nodes.add(node);
  }

  function removeNode(node) {
    nodes.delete(node);
  }

  function addTexture(texture) {
    textures.add(texture);
  }

  function removeTexture(texture) {
    textures.delete(texture);
  }

  function getTexUnit() {
    return textureUnit++;
  }

  function toFbo(nameParam, unitParam, usePrev) {
    name = nameParam;
    unit = unitParam;
    framebuffer = Framebuffer(gl);
    if (usePrev) {
      prevbuffer = Framebuffer(gl);
      prevbufferUnit = getTexUnit();
    }
  }

  function updateSingleUniform(state) {
    const u = uniforms[resolveToy(state, shadertoy, 'name')];
    if (u) {
      u.setValue(resolveToy(state, shadertoy, 'value'));
    }
  }

  function update(ustateArray) {
    // TODO: update is bad... i'd rather just reuse tex units from here
    // instead of assigning them out to textures/buffers at init time

    // global/surface uniforms
    ustateArray.forEach(updateSingleUniform);

    // textures
    textures.forEach(texture => texture.update(updateSingleUniform));

    // swapbuffer
    if (prevbuffer && uniforms.u_prevbuffer) {
      const u = uniforms.u_prevbuffer;
      if (u) {
        u.setValue(prevbufferUnit);
        gl.activeTexture(gl[`TEXTURE${prevbufferUnit}`]);
        gl.bindTexture(gl.TEXTURE_2D, prevbuffer.texture);

        // TODO... tempfix???
        prevbuffer.updateTexture();
      }
    }

    nodes.forEach(node => {
      uniforms[node.name].setValue(node.u);
      gl.activeTexture(gl[`TEXTURE${node.u}`]);
      gl.bindTexture(gl.TEXTURE_2D, node.fbo.texture);

      // TODO... tempfix???
      node.fbo.updateTexture();
    });
  }

  function render(w, h, ustateArray) {
    if (nodes.size) {
      nodes.forEach(node => node.render(w, h, ustateArray));
    }

    if (framebuffer) {
      if (prevbuffer) {
        const swap = framebuffer;
        framebuffer = prevbuffer;
        prevbuffer = swap;

        prevbuffer.bind();
        prevbuffer.updateResolution(w, h);
      }

      framebuffer.updateResolution(w, h);
      framebuffer.bind();
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    update(ustateArray);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function dispose() {
    textures.forEach(t => t.dispose());
    textures.clear();
    gl.deleteProgram(program);
  }

  return {
    get id() {
      return id;
    },
    get nodes() {
      return nodes;
    },
    get fbo() {
      return framebuffer;
    },
    get name() {
      return name;
    },
    get u() {
      return unit;
    },
    render,
    addNode,
    removeNode,
    addTexture,
    removeTexture,
    getTexUnit,
    update,
    toFbo,
    dispose,
  };
}
