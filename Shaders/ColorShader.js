//
// A flat color shader for general 3d meshes.
//
// Uniforms:
//   vec4 uColor - the flat color to render.
//
// Attributes:
//	 "VertexPositionBuffer" => aVertexPosition : The 3d position of a point.
//

var NPR = NPR || {};

NPR.ColorShader = function() {

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
  uniform vec4 uColor;\
  \
  void main(void) {\
      gl_FragColor = uColor;\
  }\
  "

  NPR.Shader.call(this, vertex_src, fragment_src);
  this.attributes = {
    "VertexPositionBuffer" : gl.getAttribLocation(this.program, "aVertexPosition")
  }
}

NPR.ColorShader.prototype = Object.create(NPR.Shader.prototype);