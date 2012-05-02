//
// A shader for painterly rendering of instanced quad billboards.
// Note that this requires 4 vertex texture units.
//
// Uniforms:
//   sampler2D uBrushTexture - the texture that defines the brush alpha.
//   sampler2D uColorTexture - a framebuffer texture of the rendered image.
//   sampler2D uDepthTexture - a framebuffer texture of the depth pass for occlusion culling.
//   sampler2D uInstanceAttrTex - the texture sampler for per-instance variables (position).
//   float uAttrTexDim  - the square dimension of the attribute texture.
//   vec2 uScale - the uniform scale (2d geometry positions are normalized)
//
// Attributes:
//   vec2 "VertexPositionBuffer" => aVertexPosition : The 2d position of the point in graftal space.
//   float "InstanceIDBuffer"    => aInstanceID : The instance id that the position belongs to.

var NPR = NPR || {};

NPR.PainterlyBillboardShader = function() {

  var gl = NPR.gl;

  var vertex_src = "\
    uniform mat4 uMVMatrix;\
    uniform mat4 uPMatrix;\
    uniform mat3 uNMatrix;\
    uniform float uAttrTexDim;\
    uniform vec2 uScale;\
    \
    uniform sampler2D uBrushTexture;\
    uniform sampler2D uColorTexture;\
    uniform sampler2D uDepthTexture;\
    uniform sampler2D uInstanceAttrTex;\
    \
    attribute vec2 aVertexPosition;\
    attribute float aInstanceID;\
    \
    varying vec2 vTexCoord;\
    varying float vFacingRatio;\
    varying vec4 vColor;\
    \
    vec2 attrTexCell(float idx) {\
        float r = floor(idx / uAttrTexDim);\
        float c = mod(idx, uAttrTexDim);\
        float drc = 0.5 / uAttrTexDim;\
        vec2 attrTc = vec2(c/uAttrTexDim+drc, r/uAttrTexDim+drc);\
        return attrTc;\
    }\
    \
    void main(void) {\
      float pi = 3.14159265358;\
      vec2 attrTc = attrTexCell(2.0 * aInstanceID);\
      vec4 instpos = texture2D(uInstanceAttrTex, attrTc);\
      vec3 instnorm = texture2D(uInstanceAttrTex, attrTexCell(2.0 * aInstanceID + 1.0)).xyz;\
      vec4 mvpos = uMVMatrix * instpos;\
      vec4 mvppos = uPMatrix * mvpos;\
      vec2 screen_coord = mvppos.xy / 2.0 / mvppos.w + vec2(0.5, 0.5);\
      vColor = texture2D(uColorTexture, screen_coord);\
      vTexCoord = aVertexPosition;\
      \
      /* Project normal to the screen. */\
      /*vec4 p1 = mvppos;\
      vec4 p2 = instpos + vec4(instnorm.xyz, 1.0);\
      p2 = uPMatrix * uMVMatrix * p2;\
      vec3 projnorm = (p2 - p1).xyz;\
      projnorm = normalize(projnorm);*/\
      vec3 projnorm = uNMatrix * instnorm.xyz;\
      float dz = -projnorm.z; projnorm.z=projnorm.y; projnorm.y=dz;\
      projnorm.z = 0.0;\
      projnorm = normalize(projnorm);\
      \
      /* Facing Ratio */\
      vec3 mvn = uNMatrix * instnorm;\
      vFacingRatio = dot(normalize(mvn), vec3(0,0,1));\
      \
      /* Rotation around screen normal. */\
      vec2 tpos = aVertexPosition - vec2(0.5, 0.5);\
      tpos = tpos * uScale;\
      float angle = atan(projnorm.y, projnorm.x) - pi/2.0;\
      float ox  = tpos.x;\
      tpos.x = tpos.x * cos(angle) - tpos.y * sin(angle);\
        tpos.y = ox * sin(angle) + tpos.y * cos(angle);\
      \
      gl_Position = mvppos;\
      gl_Position.xy = gl_Position.xy + tpos;\
    }\
  "

  var fragment_src = "\
  precision mediump float;\
  \
  uniform sampler2D uBrushTexture;\
  \
  varying float vFacingRatio;\
  varying vec4 vColor;\
  varying vec2 vTexCoord;\
  \
  void main(void) {\
    /*if (vFacingRatio < 0.5) discard;*/\
    float fade = (vFacingRatio-0.5)/0.5;\
    vec4 brushTexCol = texture2D(uBrushTexture, vTexCoord);\
    gl_FragColor.a = min(0.9, brushTexCol.a);\
    gl_FragColor.a = gl_FragColor.a * fade;\
    gl_FragColor.rgb = vColor.rgb * gl_FragColor.a;\
  }\
  "

  NPR.Shader.call(this, vertex_src, fragment_src);
  this.attributes = {"VertexPositionBuffer" : gl.getAttribLocation(this.program, "aVertexPosition"),
                     "InstanceIDBuffer"     : gl.getAttribLocation(this.program, "aInstanceID")};

}

NPR.PainterlyBillboardShader.prototype = Object.create(NPR.Shader.prototype);