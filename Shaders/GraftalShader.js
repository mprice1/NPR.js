//
// A shader for instanced graftals.
//
// Uniforms:
//   sampler2D uInstanceAttrTex - the texture sampler for per-instance variables (position).
//   float uAttrTexDim  - the square dimension of the attribute texture.
//   float uScale - the uniform graftal scale (2d geometry positions are normalized)
//   vec3 uOffset - the offset applied after transforming the instance (in graftal space).
//   vec3 uColor - the color.
//   vec3 uFadeColor - the fade out color (i.e. for when the graftals are facing the screen)
//
// Attributes:
//	 vec2 "VertexPositionBuffer" => aVertexPosition : The 2d position of the point in graftal space.
//   float "InstanceIDBuffer"    => aInstanceID : The instance id that the position belongs to.

var NPR = NPR || {};

NPR.GraftalShader = function() {

  var gl = NPR.gl;

  var vertex_src = "\
	  uniform mat4 uMVMatrix;\
	  uniform mat4 uPMatrix;\
	  uniform mat3 uNMatrix;\
	  uniform sampler2D uInstanceAttrTex;\
	  uniform float uAttrTexDim;\
	  uniform float uScale;\
	  uniform vec3 uOffset;\
	  \
	  attribute vec2 aVertexPosition;\
	  attribute float aInstanceID;\
	  \
	  varying float vFacingRatio;\
	  \
	  /* Function to look up cell from the attribute texture. */\
	  vec2 attrTexCell(float idx) {\
	  	float r = floor(idx / uAttrTexDim);\
	  	float c = mod(idx, uAttrTexDim);\
	  	float drc = 0.5 / uAttrTexDim;\
	  	vec2 attrTc = vec2(c/uAttrTexDim+drc, r/uAttrTexDim+drc);\
	  	return attrTc;\
	  }\
	  \
	  void main(void) {\
	  	vec2 attrTc = attrTexCell(2.0 * aInstanceID);\
	  	vec4 instpos = texture2D(uInstanceAttrTex, attrTc);\
	  	vec3 instnorm = texture2D(uInstanceAttrTex, attrTexCell(2.0 * aInstanceID + 1.0)).xyz;\
	  	vec4 mvpos = uMVMatrix * instpos;\
	  	mvpos.z = mvpos.z + uOffset.z;\
	  	vec4 mvppos = uPMatrix * mvpos;\
	  	\
	  	/* Project the normal to the screen */ \
	  	/*vec4 p1 = mvppos;\
	  	vec4 p2 = instpos + vec4(instnorm.xyz, 1.0);\
	  	p2 = uPMatrix * uMVMatrix * p2;\
	  	vec3 projnorm = (p2 - p1).xyz;\
	  	projnorm = normalize(projnorm);\
	    projnorm.z = 0.0;\
	    vFacingRatio = length(projnorm);\
	  	projnorm = normalize(projnorm);*/\
	  	vec3 projnorm = uNMatrix * instnorm.xyz;\
	  	projnorm.z = 0.0;\
	  	projnorm = normalize(projnorm);\
	  	\
	  	/* Facing Ratio */\
	  	vec3 mvn = uNMatrix * instnorm;\
	  	vFacingRatio = dot(normalize(mvn),vec3(0,0,1));\
	  	\
		/* Get position rotated around screen normal */\
		vec2 rotpos = aVertexPosition + vec2(-.25, -.1);\
		rotpos = rotpos * uScale;\
		rotpos.xy = rotpos.xy + uOffset.xy;\
		float pi = 3.14159265358;\
		float angle = atan(projnorm.y, projnorm.x) - pi/2.0;\
		float ox  = rotpos.x;\
		rotpos.x = rotpos.x * cos(angle) - rotpos.y * sin(angle);\
        rotpos.y = ox * sin(angle) + rotpos.y * cos(angle);\
	  	\
	  	gl_Position = mvppos;\
	  	gl_Position.xy = gl_Position.xy + rotpos;\
	  }\
	"

	var fragment_src = "\
	precision mediump float;\
	\
	uniform vec3 uColor;\
	uniform vec3 uFadeColor;\
	\
	varying float vFacingRatio;\
	void main(void) {\
	  gl_FragColor = vec4(uColor, 1.0);\
	  if (vFacingRatio > 0.7) {\
	    float fade = (vFacingRatio-.7)/.3;\
	    gl_FragColor.rgb = mix(gl_FragColor.rgb, uFadeColor, fade);\
	  }\
	  if(vFacingRatio<-0.5) discard;\
	}\
	"

	NPR.Shader.call(this, vertex_src, fragment_src);
	this.attributes = {"VertexPositionBuffer" : gl.getAttribLocation(this.program, "aVertexPosition"),
					   "InstanceIDBuffer"     : gl.getAttribLocation(this.program, "aInstanceID")};

}

NPR.GraftalShader.prototype = Object.create(NPR.Shader.prototype);