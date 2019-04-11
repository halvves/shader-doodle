# &lt;shader-doodle /&gt;

[![Latest NPM release][npm-badge]][npm-badge-url]
[![License][license-badge]][license-badge-url]

*A friendly web-component for writing and rendering shaders.*

![demo](screenshot/ex.gif)

`<shader-doodle />` is a simple web-component loosely based on the [The Book of Shaders](https://thebookofshaders.com/)'s glsl previewer and [Shadertoy](https://www.shadertoy.com/). It sets up a flat responsive canvas on which to draw fragment shaders, and provides several built in uniforms relating to time, resolution, mouse position, etc.

## Usage

### Script Include

```html
<script src="https://unpkg.com/shader-doodle"></script>
<shader-doodle>
  void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    vec3 color = vec3(st.x, st.y, abs(sin(u_time)));

    gl_FragColor = vec4(color, 1.0);
  }
</shader-doodle>
```

### Import

`npm install shader-doodle`

```javascript
import 'shader-doodle';
```

```html
<shader-doodle>
  void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    vec3 color = vec3(st.x, st.y, abs(sin(u_time)));

    gl_FragColor = vec4(color, 1.0);
  }
</shader-doodle>
```

## API

Right now the api is fairly basic. The default syntax is vanilla glsl and there are several built in uniforms following the conventions seen in [The Book of Shaders](https://thebookofshaders.com/). If you prefer ShaderToy's syntax you can set an attribute like so: `<shader-doodle shadertoy />`.

### Pre-Defined Uniforms

#### Default (`<shader-doodle />`)

* `uniform float u_time;`: shader playback time (in seconds)
* `uniform float u_delta;`: delta time between frames (in seconds)
* `uniform int u_frame;`: shader playback frame
* `uniform vec4 u_date;`: year, month, day and seconds
* `uniform vec2 u_resolution;`: viewport resolution (in pixels)
* `uniform vec2 u_mouse;`: mouse pixel coords (x & y)

#### Shadertoy (`<shader-doodle shadertoy />`)

* `uniform float iTime;`: shader playback time (in seconds)
* `uniform float iDelta;`: delta time between frames (in seconds)
* `uniform int iFrame;`: shader playback frame
* `uniform vec4 iDate;`: year, month, day and seconds
* `uniform vec2 iResolution;`: viewport resolution (in pixels)
* `uniform vec4 iMouse;`: -- mouse pixel coords. xy: current (if mousedown), zw: click.

_NOTE: the only functional difference is in mouse position behavior_

## Next steps (ordered by priority)

* shader precision attribute
* clearColor attribute
* touch support for mouse uniform
* texture attribute
* video for texture attribute
* webcam for texture attribute
* uniforms for device orientation & gyro
* lerp attribute for mouse
* custom uniforms attribute
* custom vertex shader attribute

## See Also

* [shaderpen](https://github.com/halvves/shaderpen/) - This library's predecessor.
* [The Book of Shaders](https://thebookofshaders.com/) - A gentle step-by-step guide through the abstract and complex universe of Fragment Shaders.
* [Shadertoy](https://www.shadertoy.com/) - Shader playground.

[npm-badge]: https://img.shields.io/npm/v/shader-doodle.svg
[npm-badge-url]: https://www.npmjs.com/package/shader-doodle
[license-badge]: https://img.shields.io/npm/l/shader-doodle.svg
[license-badge-url]: ./LICENSE
