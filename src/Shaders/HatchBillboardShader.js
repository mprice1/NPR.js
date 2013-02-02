//
// A shader for Hatching from Tonal Art Maps, implemented as instanced quad splats.
//
// Uniforms:
//   sampler2D uLappedMask - the alpha for each quad.
//   sampler2D uTamTex1 : the lighter three TAM levels.
//   sampler2D uTamTex2: the darker three TAM levels
//   sampler2D uInstanceAttrTex - the texture sampler for per-instance variables (position).
//   float uAttrTexDim  - the square dimension of the attribute texture.
//   vec2 uScale - the uniform scale (2d geometry positions are normalized)
//
// Attributes:
//   vec2 "VertexPositionBuffer" => aVertexPosition : The 2d position of the point in graftal space.
//   float "InstanceIDBuffer"    => aInstanceID : The instance id that the position belongs to.


var NPR = NPR || {};

NPR.HatchBillboardShader = function() {

  var gl = NPR.gl;

  var vertex_src = "\
    uniform float uYaw;\
    uniform float uPitch;\
    \
    uniform mat4 uMVMatrix;\
    uniform mat4 uPMatrix;\
    uniform mat3 uNMatrix;\
    uniform float uAttrTexDim;\
    uniform vec2 uScale;\
    uniform vec3 uLightDir;\
    \
    uniform sampler2D uLappedMask;\
    uniform sampler2D uTamTex1;\
    uniform sampler2D uTamTex2;\
    uniform sampler2D uInstanceAttrTex;\
    \
    attribute vec2 aVertexPosition;\
    attribute float aInstanceID;\
    \
    varying vec2 vTexCoord;\
    varying float vFacingRatio;\
    varying float vLightIntensity;\
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
      vTexCoord = aVertexPosition;\
      \
      /* Project normal to the screen. */\
      vec4 p1 = mvppos;\
      vec4 p2 = instpos + vec4(instnorm.xyz, 1.0);\
      p2 = uPMatrix * uMVMatrix * p2;\
      vec3 projnorm = (p2 - p1).xyz;\
      float dz = -projnorm.z; projnorm.z=projnorm.y; projnorm.y=dz;\
      projnorm = normalize(projnorm);\
      projnorm.z = 0.0;\
      projnorm = normalize(projnorm);\
      \
      /* Facing Ratio */\
      vec3 mvn = normalize(uNMatrix * instnorm);\
      vFacingRatio = dot(mvn, vec3(0,0,1));\
      vLightIntensity = dot(mvn, normalize(uLightDir));\
      \
        /* Build a rotation matrix so we don't billboard. */\
      vec3 ra = -cross(vec3(0,0,1.0), mvn);\
      float cA = dot(vec3(0,0,1.0), mvn);\
      float icA = 1.0 - cA;\
      float sA = sin(acos(cA));\
      mat3 rotMat;\
      float r00 = cA+ra.x*ra.x*icA;  float r01 = ra.x*ra.y*icA-ra.z*sA; float r02 = ra.x*ra.z*icA+ra.y*sA;\
      float r10 = ra.y*ra.x*icA+ra.z*sA;  float r11 = cA+ra.y*ra.y*icA;  float r12 = ra.y*ra.z*icA-ra.x*sA;\
      float r20 = ra.z*ra.x*icA-ra.y*sA;  float r21 = ra.z*ra.y*icA+ra.x*sA;  float r22 = cA+ra.z*ra.z*icA;\
        rotMat[0] = vec3(r00, r01, r02);\
      rotMat[1] = vec3(r10, r11, r12);\
      rotMat[2] = vec3(r20, r21, r22);\
      vec3 rmp = rotMat * vec3((aVertexPosition-vec2(.5,.5))*uScale, 0);\
      vec4 ppp = mvpos + vec4(rmp, 0);\
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
      gl_Position = uPMatrix * ppp;\
    }\
  "

  var fragment_src = "\
  precision mediump float;\
  \
    uniform sampler2D uLappedMask;\
  uniform sampler2D uTamTex1;\
  uniform sampler2D uTamTex2;\
  \
  varying float vFacingRatio;\
  varying vec2 vTexCoord;\
  varying float vLightIntensity;\
  \
  void main(void) {\
    if (vFacingRatio < -0.0) discard;\
    float fade = (vFacingRatio-0.25)/0.75;\
    vec4 mask = texture2D(uLappedMask, vTexCoord);\
    float hatchval = 0.0;\
    vec4 hatchSamp1 = texture2D(uTamTex1, vTexCoord);\
    vec4 hatchSamp2 = texture2D(uTamTex2, vTexCoord);\
    if (vLightIntensity > 0.9) {\
      hatchval = mix(1.0, hatchSamp1.x, 1.0-(vLightIntensity - 0.9)/0.1);\
    } else if (vLightIntensity > 0.8) {\
      float v1 = hatchSamp1.x;\
      float v2 = hatchSamp1.y;\
      hatchval = mix(v1, v2, 1.0-(vLightIntensity - 0.8)/0.2);\
    } else if (vLightIntensity > 0.65) {\
      float v1 = hatchSamp1.y;\
      float v2 = hatchSamp1.z;\
      hatchval = mix(v1, v2, 1.0-(vLightIntensity - 0.65)/0.15);\
    } else if (vLightIntensity > 0.5) {\
      float v1 = hatchSamp1.z;\
      float v2 = hatchSamp2.x;\
      hatchval = mix(v1, v2, 1.0-(vLightIntensity - 0.5)/0.15);\
    } else if (vLightIntensity > 0.35) {\
      float v1 = hatchSamp2.x;\
      float v2 = hatchSamp2.y;\
      hatchval = mix(v1, v2, 1.0-(vLightIntensity - 0.35)/0.15);\
    } else if (vLightIntensity > 0.2) {\
      float v1 = hatchSamp2.y;\
      float v2 = hatchSamp2.z;\
      hatchval = mix(v1, v2, 1.0-(vLightIntensity - 0.2)/0.15);\
    } else {\
      hatchval = texture2D(uTamTex2, vTexCoord).z;\
    }\
    gl_FragColor.a = mask.r;\
    if (mask.r < 0.01) discard;\
    gl_FragColor.a = gl_FragColor.a * fade;\
      gl_FragColor.rgb = vec3(hatchval, hatchval, hatchval) * gl_FragColor.a;\
  }\
  "

  NPR.Shader.call(this, vertex_src, fragment_src);
  this.attributes = {"VertexPositionBuffer" : gl.getAttribLocation(this.program, "aVertexPosition"),
                     "InstanceIDBuffer"     : gl.getAttribLocation(this.program, "aInstanceID")};

}

NPR.HatchBillboardShader.prototype = Object.create(NPR.Shader.prototype);