//
// A directional light shader for a single  color.
//
// Uniforms:
//   vec3 uColor - the flat color to render.
//   vec uLightDir - 
//
// Attributes:
//	 "VertexPositionBuffer" => aVertexPosition : The 3d position of a point.
//   "VertexNormalBuffer"   => aVertexNormal   : Normal.

var NPR = NPR || {};

NPR.ColorLightDirShader = function() {

  var gl = NPR.gl;

  var vertex_src = "\
  attribute vec3 aVertexPosition;\
  attribute vec3 aVertexNormal;\
  uniform mat4 uMVMatrix;\
  uniform mat4 uPMatrix;\
  uniform mat3 uNMatrix;\
  uniform vec3 uLightDir;\
  varying float vLightIntensity;\
  void main(void) {\
    vLightIntensity = dot(uLightDir, uNMatrix * aVertexNormal);\
  	gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
  }\
  "

  var fragment_src = "\
  #ifdef GL_ES\n\
  	precision highp float;\n\
  #endif\n\
  uniform vec3 uColor;\
  varying float vLightIntensity;\
  \
  void main(void) {\
      gl_FragColor.rgb = mix(vec3(0,0,0), uColor, vLightIntensity);\
      gl_FragColor.a = 1.0;\
  }\
  "

  NPR.Shader.call(this, vertex_src, fragment_src);
  this.attributes = {
    "VertexPositionBuffer" : gl.getAttribLocation(this.program, "aVertexPosition"),
    "VertexNormalBuffer"   : gl.getAttribLocation(this.program, "aVertexNormal")
  }
}

NPR.ColorLightDirShader.prototype = Object.create(NPR.Shader.prototype);