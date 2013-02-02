//
// A Depth shader for general 3d meshes.
//
// Uniforms:
//   uNear - the near clipping plane.
//   uFar  - the far clipping plane.
//
// Attributes:
//	 "VertexPositionBuffer" => aVertexPosition : The 3d position of a point.
//

var NPR = NPR || {};

NPR.DepthShader = function() {

  var gl = NPR.gl;

  var vertex_src = "\
  attribute vec3 aVertexPosition;\
  uniform mat4 uMVMatrix;\
  uniform mat4 uPMatrix;\
  uniform mat3 uNMatrix;\
  void main(void) {\
  	gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
  }\
  "

  var fragment_src = "\
  #ifdef GL_ES\n\
  	precision highp float;\n\
  #endif\n\
  uniform float uNear;\
  uniform float uFar;\
  \
  float linearizeDepth(float d) { \
      float n = uNear + 0.00001;\
      return (2.0 * n) / (uFar + n - d * (uFar - n));\
  }\
  \
  void main(void) {\
  	  float depth = linearizeDepth(gl_FragCoord.z);\
      gl_FragColor.r = depth;\
      gl_FragColor.g = gl_FragColor.r;\
      gl_FragColor.b = gl_FragColor.r;\
      gl_FragColor.a = 1.0;\
  }\
  "

  NPR.Shader.call(this, vertex_src, fragment_src);
  this.attributes = {
    "VertexPositionBuffer" : gl.getAttribLocation(this.program, "aVertexPosition")
  }
}

NPR.DepthShader.prototype = Object.create(NPR.Shader.prototype);