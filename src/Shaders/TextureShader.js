//
// A flat texture shader.
//

var NPR = NPR || {};

NPR.TextureShader = function() {

  var gl = NPR.gl;

  var vertex_src = "\
  attribute vec3 aVertexPosition;\
  attribute vec2 aVertexTexcoord;\
  uniform mat4 uMVMatrix;\
  uniform mat4 uPMatrix;\
  varying vec2 vTexCoord;\
  void main(void) {\
    vTexCoord = aVertexTexcoord;\
    vec4 mvpos = uMVMatrix * vec4(aVertexPosition, 1.0);\
  	gl_Position = uPMatrix * mvpos;\
  }\
  "

  var fragment_src = "\
  #ifdef GL_ES\n\
  	precision highp float;\n\
  #endif\n\
  uniform sampler2D uTexture;\
  varying vec2 vTexCoord;\
  uniform vec2 uScale;\
  \
  void main(void) {\
      vec2 tc = vTexCoord * uScale;\
      if (uScale.y < 0.0 && uScale.y >= -1.1) {\
        tc.y = 1.0 - vTexCoord.y;\
      }\
      if (uScale.x < 0.0 && uScale.x >= -1.1) {\
        tc.x = 1.0 - vTexCoord.x;\
      }\
      vec4 texcol = texture2D(uTexture, tc);\
      gl_FragColor = texcol;\
  }\
  "

  NPR.Shader.call(this, vertex_src, fragment_src);
  this.attributes = {
    "VertexPositionBuffer" : gl.getAttribLocation(this.program, "aVertexPosition"),
    "TextureCoordinateBuffer" : gl.getAttribLocation(this.program, "aVertexTexcoord")
  }
  this.setUniforms({
    'uScale' : [1,1]
  });
}

NPR.TextureShader.prototype = Object.create(NPR.Shader.prototype);