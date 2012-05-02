//
// A vertex normal rendering pass.  XYZ -> RGB.
//
// Parameter pack, if it evaluates to true, increases precision by packing the float depth value
// into the RGB channels.  The RenderPass which uses this should be expecting to decode the packed float.
// Otherwise, r=g=b for a less precise but visually understandable greyscale depth pass.

var NPR = NPR || {};

NPR.DepthPass = function(pack) {

  NPR.RenderPass.call(this);
	
  var gl = NPR.gl;

  var fragment_src = "\
  #ifdef GL_ES\n\
  	precision highp float;\n\
  #endif\n\
  uniform float uNear;\
  uniform float uFar;\
  \
  \n#ifdef PACK_FLOAT\n\
  vec3 pack(float f) {\
    vec3 v = fract(f * vec3(1.0, 256.0, 65536.0));\
    v = floor(v * 256.0) / 256.0;\
    return v;\
  }\
  \n#endif\n\
  \
  float linearizeDepth(float d) { \
      float n = uNear + 0.00001;\
      return (2.0 * n) / (uFar + n - d * (uFar - n));\
  }\
  \
  void main(void) {\
  	float depth = linearizeDepth(gl_FragCoord.z);\
    \n#ifdef PACK_FLOAT\n\
      gl_FragColor.rgb = pack(depth);\
    \n#else\n\
      gl_FragColor.r = depth;\
      gl_FragColor.g = gl_FragColor.r;\
      gl_FragColor.b = gl_FragColor.r;\
    \n#endif\n\
    gl_FragColor.a = 1.0;\
  }\
  "

  if (pack) fragment_src = "#define PACK_FLOAT\n" + fragment_src;

  var vertex_src = "\
  attribute vec3 aVertexPosition;\
  uniform mat4 uMVMatrix;\
  uniform mat4 uPMatrix;\
  uniform mat3 uNMatrix;\
  void main(void) {\
  	gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
  }\
  "

  this.shader = new NPR.Shader(vertex_src, fragment_src);
   
  this.shader.attributes = {
	  "VertexPositionBuffer" : gl.getAttribLocation(this.shader.program, "aVertexPosition")
	};

  //this.shader.setUniforms({"uNear":0.01, "uFar":10.0});
}

// Draws the scene to the internal framebuffer.
NPR.RenderPass.prototype.updateFramebuffer = function(drawcall) {
  var gl = NPR.gl;
  this.framebuffer.bind();
  gl.clearColor(1.0,1.0,1.0,1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, this.framebuffer.fbo.width, this.framebuffer.fbo.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  this.drawImmediate(drawcall);
  this.framebuffer.release();
}

NPR.DepthPass.prototype = Object.create(NPR.RenderPass.prototype);