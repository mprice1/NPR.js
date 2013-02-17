var NPR = NPR || {};

// Optical flow shader using roughly the Lucas Kanade approach as
// described in http://en.wikipedia.org/wiki/Lucas%E2%80%93Kanade_method
// This is a pretty straightfoward dumb implementation and you can probably
// do something cooler/more accurate/more efficient.
//
// This shader normalizes the output by dividing it by the texture dimension
// (input as a uniform vec2) and mapping [-1, 1] to [0, 1] so that it can fit
// in a standard texture. There is nothing stopping you from removing this
// normalization step at the end and using floating point textures if you are
// so inclined.

NPR.OpticalFlowShader = function() {
  var gl = NPR.gl;

  var vertex_src = "\
  attribute vec3 aVertexPosition;\
  attribute vec2 aVertexTexcoord;\
  \
  uniform mat4 uMVMatrix;\
  uniform mat4 uPMatrix;\
  \
  varying vec2 vTexCoord;\
  \
  void main(void) {\
    vTexCoord = aVertexTexcoord;\
    vec4 mvpos = uMVMatrix * vec4(aVertexPosition, 1.0);\
    gl_Position = uPMatrix * mvpos;\
  }\
  ";

  var fragment_src = "\
  #ifdef GL_ES\n\
    precision highp float;\n\
  #endif\n\
  uniform sampler2D uTexture0;\
  uniform sampler2D uTexture1;\
  uniform sampler2D uTexture2;\
  uniform vec2 uTexDim;\
  uniform float uSampleReach;\
  \
  varying vec2 vTexCoord;\
  \
  float valueFromRgb(vec4 color) {\
    return dot(vec3(0.3, 0.59, 0.11), color.rgb);\
  }\
  \
  float xGradient(vec2 coord) {\
    vec2 dx = vec2(1.0 / uTexDim.x, 0.0);\
    return valueFromRgb(texture2D(uTexture1, coord + dx))\
         - valueFromRgb(texture2D(uTexture1, coord - dx));\
  }\
  \
  float yGradient(vec2 coord) {\
    vec2 dy = vec2(0.0, 1.0 / uTexDim.y);\
    return valueFromRgb(texture2D(uTexture1, coord + dy))\
         - valueFromRgb(texture2D(uTexture1, coord - dy));\
  }\
  \
  float tGradient(vec2 coord) {\
    return valueFromRgb(texture2D(uTexture2, coord))\
         - valueFromRgb(texture2D(uTexture0, coord));\
  }\
  \
  void main(void) {\
    float sIxIx = 0.0;\
    float sIyIy = 0.0;\
    float sIxIy = 0.0;\
    float sIxIt = 0.0;\
    float sIyIt = 0.0;\
    const float sample_iter_bound = 10.0;\
    for (float x = -sample_iter_bound; x <= sample_iter_bound; x += 1.0) {\
      for (float y = -sample_iter_bound; y <= sample_iter_bound; y += 1.0) {\
        vec2 coord = vTexCoord + vec2(uSampleReach * x / uTexDim.x, uSampleReach * y / uTexDim.y);\
        float Ix = xGradient(coord);\
        float Iy = yGradient(coord);\
        float It = tGradient(coord);\
        sIxIx += Ix * Ix;\
        sIyIy += Iy * Iy;\
        sIxIy += Ix * Iy;\
        sIxIt += Ix * It;\
        sIyIt += Iy * It;\
      }\
    }\
    float ad_m_bc = sIxIx * sIyIy - sIxIy * sIxIy;\
    vec2 flow = vec2(0,0);\
    if (ad_m_bc != 0.0) {\
      mat2 invA = mat2(sIyIy, -sIxIy, -sIxIy, sIxIx) / ad_m_bc;\
      flow = invA * -vec2(sIxIt, sIyIt);\
    }\
    vec2 normalized_flow = flow / uTexDim;\
    vec2 pos_normalized_flow = normalized_flow / 2.0 + vec2(0.5, 0.5);\
    \
    gl_FragColor = vec4(pos_normalized_flow, 0.0, 1.0);\
  }\
  ";

  NPR.Shader.call(this, vertex_src, fragment_src);
  this.attributes = {"VertexPositionBuffer" : gl.getAttribLocation(this.program, "aVertexPosition"),
                     "TextureCoordinateBuffer"     : gl.getAttribLocation(this.program, "aVertexTexcoord")};
  this.setUniforms({
    "uTexDim" : [640, 480],
    "uSampleReach": 10,
  });
}

NPR.OpticalFlowShader.prototype = Object.create(NPR.Shader.prototype);