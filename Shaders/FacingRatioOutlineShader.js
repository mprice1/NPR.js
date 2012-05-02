//
// A facing-ratio based outline shader.
//
// Uniforms:
//   vec3 uColor - the flat color to render.
//   vec3 uOutlineColor - the outline color.
//
// Attributes:
//	 "VertexPositionBuffer" => aVertexPosition : The 3d position of a point.
//

var NPR = NPR || {};

NPR.FacingRatioOutlineShader = function() {

  var gl = NPR.gl;

  var vertex_src = "\
  attribute vec3 aVertexPosition;\
  attribute vec3 aVertexNormal;\
  uniform mat4 uMVMatrix;\
  uniform mat4 uPMatrix;\
  uniform mat3 uNMatrix;\
  varying float vFacingRatio;\
  void main(void) {\
    /* Facing Ratio */\
    vec3 mvn = uNMatrix * aVertexNormal;\
    vFacingRatio = dot(normalize(mvn), vec3(0,0,1));\
  	gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
  }\
  "

  var fragment_src = "\
  #ifdef GL_ES\n\
  	precision highp float;\n\
  #endif\n\
  uniform vec3 uColor;\
  uniform vec3 uOutlineColor;\
  varying float vFacingRatio;\
  \
  void main(void) {\
      float val = smoothstep(0.0, 0.4, vFacingRatio-0.2);\
      gl_FragColor.rgb = mix(uOutlineColor, uColor, val);\
      gl_FragColor.a = 1.0;\
  }\
  "

  NPR.Shader.call(this, vertex_src, fragment_src);
  this.attributes = {
    "VertexPositionBuffer" : gl.getAttribLocation(this.program, "aVertexPosition"),
    "VertexNormalBuffer" : gl.getAttribLocation(this.program, "aVertexNormal")
  }
}

NPR.FacingRatioOutlineShader.prototype = Object.create(NPR.Shader.prototype);