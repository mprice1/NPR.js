//
// Textured outline shader.  
//
// Uniforms:
//   vec2 uScreenDim - dimensions of the screen.
//   sampler2d uAttrTex - attribute texture describing the Edge Mesh.
//   sampler2d uDepthTex - framebuffer texture from depth pass.
//   sampler2d uStrokeTex - texture for stroke alpha.
//   float uAttrTexDim - square dimension of attribute texture.
//   float uNear - the near clipping plane.
//   float uFar  - the far clipping plane.
//   float uStrokeWidth - thickness of outline.
//   float uStrokeRepeat - repeat of texture.
//   float uStrokeRepeatDFactor - the influence that distance has on texture coordinate.
//   vec3 uColor - color of outline.
//
// Attributes:
//	 "VertexPositionBuffer" => aVertexPosition : The 3d position of a point.
//

var NPR = NPR || {};

NPR.OutlineShader = function() {

  var gl = NPR.gl;

  var vertex_src = "\
    uniform mat4 uMVMatrix;\
	  uniform mat4 uPMatrix;\
	  uniform mat3 uNMatrix;\
	  \
    uniform vec2 uScreenDim;\
	  uniform sampler2D uAttrTex;\
    uniform sampler2D uDepthTex;\
	  uniform float uAttrTexDim;\
    uniform float uNear;\
    uniform float uFar;\
    uniform float uStrokeWidth;\
    uniform float uStrokeRepeat;\
    uniform float uStrokeRepeatDFactor;\
	  \
	  attribute vec2 aEdgeIndices;\
	  \
	  varying vec2 vTexCoord;\
    \
    varying float ang;\
    varying float depth_disc0;\
    varying float depth_disc1;\
    varying float tex_depth_0;\
    varying float tex_depth_1;\
    varying float geo_depth_0;\
    varying float geo_depth_1;\
	  \n\
    #define PI 3.14159265358\n\
    \
	  bool feq(float f1, float f2) {\
	  	return abs(f1-f2)<0.0001;\
	  }\
	  \
	  vec2 attrTexCell(float idx) {\
	  	  float r = floor(idx / uAttrTexDim);\
	  	  float c = mod(idx, uAttrTexDim);\
	  	  float drc = 0.5 / uAttrTexDim;\
	  	  vec2 attrTc = vec2(c/uAttrTexDim+drc, r/uAttrTexDim+drc);\
	  	  return attrTc;\
	  }\
    \
    float linearizeDepth(float d) { \
      float n = uNear + 0.00001;\
      return (2.0 * n) / (uFar + n - d * (uFar - n));\
    }\
	  \
	  void main(void) {\
       /* Main geometric values. */\
	  	 float eid = aEdgeIndices.y;\
	  	 float vid = aEdgeIndices.x;\
	  	 vec3 v0 = texture2D(uAttrTex, attrTexCell(7.0 * eid)).xyz;\
	  	 vec3 v1 = texture2D(uAttrTex, attrTexCell(7.0 * eid + 1.0)).xyz;\
	  	 vec3 v2 = texture2D(uAttrTex, attrTexCell(7.0 * eid + 2.0)).xyz;\
	  	 vec3 v3 = texture2D(uAttrTex, attrTexCell(7.0 * eid + 3.0)).xyz;\
	  	 vec3 n0 = texture2D(uAttrTex, attrTexCell(7.0 * eid + 4.0)).xyz;\
	  	 vec3 n1 = texture2D(uAttrTex, attrTexCell(7.0 * eid + 5.0)).xyz;\
	  	 float r = texture2D(uAttrTex, attrTexCell(7.0 * eid + 6.0)).x;\
	  	 vec3 tn0 = normalize(cross(v1-v0, v2-v0));\
	  	 vec3 tn1 = normalize(cross(v3-v0, v1-v0));\
       \
       /* Screen space and depth testing values */\
       \
	  	 vec4 s0 = (uPMatrix * uMVMatrix * vec4(v0, 1.0));\
       s0 = s0/s0.w;\
       vec2 sc0 = s0.xy / 2.0 + vec2(0.5,0.5);\
       geo_depth_0 = linearizeDepth(s0.z);\
       float depth_discrepancy_0 = (geo_depth_0 - tex_depth_0);\
	  	 vec4 s1 = (uPMatrix * uMVMatrix * vec4(v1, 1.0));\
       s1 = s1/s1.w;\
       vec2 sc1 = s1.xy / 2.0 + vec2(0.5,0.5);\
       geo_depth_1 = linearizeDepth(s1.z);\
       float depth_discrepancy_1 = (geo_depth_1 - tex_depth_1);\
       \
        vec2 dScreen = vec2(1.0/uScreenDim.x, 1.0/uScreenDim.y);\
        float vDepthTexVal0 = texture2D(uDepthTex, sc0).r;\
        float vDepthTexVal1 = texture2D(uDepthTex, sc1).r;\
        /* Sample in a small window around the screen point and take the lowest depth  */\
        /* In order to combat the inherent problems of sampling on edges */\
        for (int dx = -1; dx <= 1; dx++) {\
          for (int dy = -1; dy <= 1; dy++) {\
            vec2 dsc = sc0 + dScreen * vec2(float(dx), float(dy));\
            float dd = texture2D(uDepthTex, dsc).r;\
            vDepthTexVal0 = min(vDepthTexVal0, dd);\
            dsc = sc1 + dScreen * vec2(float(dx), float(dy));\
            dd = texture2D(uDepthTex, dsc).r;\
            vDepthTexVal1 = min(vDepthTexVal1, dd);\
          }\
        }\
        depth_discrepancy_0 = abs(geo_depth_0 - (1.0 - vDepthTexVal0));\
        depth_discrepancy_1 = abs(geo_depth_1 - (1.0 - vDepthTexVal1));\
        depth_disc0 = depth_discrepancy_0;\
        depth_disc1 = depth_discrepancy_1;\
        tex_depth_0 = vDepthTexVal0;\
        tex_depth_1 = vDepthTexVal1;\
       \
       /* Edge thickness offset values */\
	  	 vec2 sp = normalize(vec2(s0.y-s1.y, s1.x-s0.x));\
	  	 vec2 m0 = (uPMatrix * uMVMatrix * vec4(v0+vec3(sp,0), 1.0)).xy - s0.xy;\
	  	 vec3 offset = vec3(sp*sign(dot(n0.xy, sp)), 0.0) * 1.0;\
       offset = n0 * uStrokeWidth;\
       \
       /* Angle stuff for texture coordinates. */\
       vec3 objCtr = vec3(0,0,0);\
       vec4 screenCtr = uPMatrix * uMVMatrix * vec4(objCtr, 1.0);\
       screenCtr = screenCtr/screenCtr.w;\
       vec2 screen_ctr_v0 = s0.xy - screenCtr.xy;\
       vec2 screen_ctr_v1 = s1.xy - screenCtr.xy;\
       float ctr_dst_0 = length(screen_ctr_v0);\
       float ctr_dst_1 = length(screen_ctr_v1);\
       float pang0 = (atan(screen_ctr_v0.y, screen_ctr_v0.x) + PI) / (2.0*PI);\
       float pang1 = (atan(screen_ctr_v1.y, screen_ctr_v1.x) + PI) / (2.0*PI);\
       if (abs(pang0-pang1)>0.9) {\
        if (pang0 < pang1) {\
          pang1 = 1.0 - pang1;\
        } else {\
          pang0 = 1.0 - pang0;\
        }\
       }\
       \
       float tex_scale = uStrokeRepeat;\
       ang=pang0;\
	  	 vec3 siv;\
	  	 vTexCoord = vec2(0.0, 0.0);\
	  	 float scale = 0.2;\
	  	 if (feq(vid, 0.0)) {\
	  	 	siv = v0 - scale*offset;\
	  	 	vTexCoord = vec2(pang0*tex_scale+uStrokeRepeatDFactor*ctr_dst_0, 0.0);\
	  	 } else if (feq(vid, 1.0)) {\
        offset = n1 * uStrokeWidth;\
        ang = pang1;\
	  	 	siv = v1 - scale*offset;\
	  	 	vTexCoord = vec2(pang1*tex_scale+uStrokeRepeatDFactor*ctr_dst_1, 0.0);\
	  	 } else if (feq(vid, 2.0)) {\
        offset = n1 * uStrokeWidth;\
	  	 	siv = v1 + scale*offset;\
        ang = pang1;\
	  	 	vTexCoord = vec2(pang1*tex_scale+uStrokeRepeatDFactor*ctr_dst_1, 1.0);\
		 } else if (feq(vid, 3.0)) {\
		 	siv = v0 + scale*offset;\
		 	vTexCoord = vec2(pang0*tex_scale+uStrokeRepeatDFactor*ctr_dst_0, 1.0);\
		 } else {\
		 	siv = vec3(-5.0,-5.0,-5.0);\
		 }\
		 if (sign(dot(uNMatrix*tn0, vec3(0,0,1.0)))==sign(dot(uNMatrix*tn1, vec3(0,0,1.0)))) {\
		 	siv = vec3(-5.0,-5.0,-5.0);\
		 }\
		 if (dot(uNMatrix*n0, vec3(0,0,1.0))<-0.5 || dot(uNMatrix*n1, vec3(0,0,1.0))<-0.5) {\
		 	siv = vec3(-5.0,-5.0,-5.0);\
		 }\
	  	 gl_Position = uPMatrix * uMVMatrix * vec4(siv, 1.0);\
	  }\
    "

  var fragment_src = "\
    precision mediump float;\
    varying vec2 vTexCoord;\
    uniform sampler2D uStrokeTex;\
    uniform vec3 uColor;\
    varying float ang;\
    varying float depth_disc0;\
    varying float depth_disc1;\
    varying float tex_depth_0;\
    varying float tex_depth_1;\
    varying float geo_depth_0;\
    varying float geo_depth_1;\
    \
      void main(void) {\
      	float dy = 1.0 - abs(vTexCoord.y - 0.5);\
        float texAlpha = texture2D(uStrokeTex, vTexCoord).a;\
        vec3 col = uColor;\
        if (geo_depth_0 > tex_depth_0-0.05 && geo_depth_1 > tex_depth_1-0.05) { col = vec3(0,1.0,0); discard; }\
        gl_FragColor = vec4(col*texAlpha, texAlpha);\
      }\
    "

  NPR.Shader.call(this, vertex_src, fragment_src);
  this.attributes = {
    "EdgeIndicesBuffer" : gl.getAttribLocation(this.program, "aEdgeIndices")
  }
}

NPR.OutlineShader.prototype = Object.create(NPR.Shader.prototype);