//
// Our Painterly Billboard rendering pass.
//
var NPR = NPR || {};

NPR.PainterlyBillboardPass = function(do_scale, orientation_mode) {

  // Options:
  // Size pass: Size or just alpha?  Default is just alpha.

  // Orientation: texture, uniform value, or sceen aligned?
  // Orientation texture overrides orientation uniform.
  // If neither, we should just use plain old fashioned point sprites to
  // get the biggest PointSize range possible.
  // Default requires a texture.
  var use_orientation_texture = false;
  var use_orientation_uniform = false;
  if (orientation_mode == "texture") {
    use_orientation_texture = true;
    use_orientation_uniform = false;
  } else if (orientation_mode == "value") {
    use_orientation_texture = false;
    use_orientation_uniform = true;
  } else if (orientation_mode == "none") {
    use_orientation_texture = false;
    use_orientation_uniform = false;
  } else {
    use_orientation_texture = true;
    use_orientation_uniform = false;
  }



  NPR.RenderPass.call(this);
	
  var gl = NPR.gl;

  // Add all the options to the define header.
  // I don't think there's a really compelling reason to have
  // separate headers for vertex and fragment shaders.
  var define_header = "";
  if (do_scale) define_header += "\n#define DO_SCALE\n";
  if (use_orientation_texture) define_header += "\n#define ORIENTATION_TEXTURE\n";
  if (use_orientation_uniform) define_header += "\n#define ORIENTATION_UNIFORM\n";
  if (!use_orientation_texture && !use_orientation_uniform)
    define_header += "\n#define NO_ORIENTATION\n";

  var fragment_src = "\
  #ifdef GL_ES\n\
  	precision highp float;\n\
  #endif\n\
  \
  uniform sampler2D uBrushTexture;\
  \
  uniform vec2 uBaseDimensions;\
  \
  varying float rdist;\
  varying vec3 vColor;\
  varying vec2 vDim;\
  varying float nz;\
  varying float size_factor;\
  \n#ifndef NO_ORIENTATION\n\
    varying float angle;\
  \n#endif\n\
  \
  void main(void) {\
    if(nz<=0.5) discard;\
    \
    \n#ifndef NO_ORIENTATION\n\
      /* Here is where we rotate the point sprite. */\
      vec2 offset = gl_PointCoord - vec2(0.5,0.5);\
      float ox = offset.x;\
      offset.x = offset.x * cos(angle) - offset.y * sin(angle);\
      offset.y = ox * sin(angle) + offset.y * cos(angle);\
      offset = offset / vec2(vDim.x / rdist / 2.0, vDim.y / rdist / 2.0);\
      offset = offset + vec2(0.5, 0.5);\
    \n#else\n\
      vec2 offset = gl_PointCoord;\
    \n#endif\n\
    \
    vec4 texCol = texture2D(uBrushTexture, offset);\
    if (offset.x < 0.0 || offset.y < 0.0 || offset.x > 1.0 || offset.y > 1.0) {\
      texCol = vec4(0.0,0.0,0.0,0.0);\
    }\
    gl_FragColor.a = min(0.9, texCol.a * 1.0);\
    gl_FragColor.rgb = vColor.rgb * gl_FragColor.a;\
  }\
  "

  var vertex_src = "\
  attribute vec3 aVertexPosition;\
  attribute vec3 aVertexNormal;\
  \
  uniform mat4 uMVMatrix;\
  uniform mat4 uPMatrix;\
  uniform mat3 uNMatrix;\
  \
  uniform sampler2D uBrushTexture;\
  uniform sampler2D uColorTexture;\
  /* In this implementation, controls both size and opacity */\
  uniform sampler2D uSizeTexture;\
  uniform sampler2D uOrientationTexture;\
  \
  uniform vec2 uBaseDimensions;\
  uniform vec2 uOrientation;\
  \
  varying float rdist;  /* The radius that must be accomodated for rotation. */\
  varying vec2 vDim;\
  varying vec3 vColor;\
  varying float nz;\
  varying float size_factor;\
  \n#ifndef NO_ORIENTATION\n\
    varying float angle;\
  \n#endif\n\
  \
  void main(void) {\
    float pi = 3.14159265358;\
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
    vec2 screen_coord = gl_Position.xy / 2.0 / gl_Position.w + vec2(0.5, 0.5);\
    vColor = texture2D(uColorTexture, screen_coord).rgb;\
    \n#ifdef ORIENTATION_TEXTURE\n\
      vec2 orientation = texture2D(uOrientationTexture, screen_coord).rg;\
    \n#else\n\
      \n#ifdef ORIENTATION_UNIFORM\n\
        vec2 orientation = uOrientation;\
      \n#endif\n\
    \n#endif\n\
    \
    \n#ifndef NO_ORIENTATION\n\
      angle = atan(orientation.y - 0.5, orientation.x - 0.5) + 3.0 * pi / 4.0;\
    \n#endif\n\
    \
    size_factor = texture2D(uSizeTexture, screen_coord).x;\
    nz = (uNMatrix * aVertexNormal).z;\
    vDim = uBaseDimensions;\
    \
    \n#ifdef DO_SCALE\n\
      vDim = uBaseDimensions * size_factor;\
    \n#endif\n\
    \
    vDim = max(vDim, vec2(0.2,0.2));\
    rdist = 0.5 * length(vDim);\
    \
    \n#ifdef NO_ORIENTATION\n\
      rdist = max(vDim.x,vDim.y) * 2.0;\
    \n#endif\n\
    \
    /* FYI: On many configurations gl_PointSize is capped at 64. */\
    gl_PointSize = 2.0 * rdist;\
    /* A hack to hide back-facing points. */\
  	if (nz <= 0.5) {\
      gl_PointSize = 0.0;\
    }\
  }\
  "

  vertex_src = define_header + vertex_src;
  fragment_src = define_header + fragment_src;

  this.shader = new NPR.Shader(vertex_src, fragment_src);
   
  this.attributes = {
	  "RandomSampleBuffer" : gl.getAttribLocation(this.shader.program, "aVertexPosition"),
	  "RandomSampleNormalBuffer" : gl.getAttribLocation(this.shader.program, "aVertexNormal")
	};
  this.uniforms = {
    "uBaseDimensions" : gl.getUniformLocation(this.shader.program, "uBaseDimensions"),
    "uBrushTexture" : gl.getUniformLocation(this.shader.program, "uBrushTexture"),
    "uOrientation" : gl.getUniformLocation(this.shader.program, "uOrientation")
  };
  this.internal_uniforms = {    
    "uColorTexture" : gl.getUniformLocation(this.shader.program, "uColorTexture"),
    "uOrientationTexture" : gl.getUniformLocation(this.shader.program, "uOrientationTexture"),
    "uSizeTexture" : gl.getUniformLocation(this.shader.program, "uSizeTexture")
  };

  this.shader.attributes = this.attributes;
  this.shader.uniforms = this.uniforms;

  //
  // Default uniform values.
  //
  gl.useProgram(this.shader.program);
  gl.uniform2fv(this.uniforms["uBaseDimensions"], [20, 20]);
  gl.uniform2fv(this.uniforms["uOrientation"], [.5,.5]);

  //
  // Children:
  //
  this.ColorPass = undefined;
  this.SizePass = undefined;
  this.OrientationPass = undefined;
  this.children = {
    "ColorPass" : undefined,
    "SizePass" : undefined,
    "OrientationPass" : undefined
  }

  //
  //  Overridden methods:
  //

  // drawModel() is overridden to tell the shader to draw point sprites from the RandomSampleBuffer.
  this.drawModel = function(model) {
    this.shader.drawModel(model, gl.POINTS, "RandomSampleBuffer");
  }

  // draw() is overridden to make sure the children draw themselves first.
  this.draw = function(drawcall) {
    // Propogate to children.
    this.ColorPass.updateFramebuffer(drawcall);
    this.SizePass.updateFramebuffer(drawcall);
    this.OrientationPass.updateFramebuffer(drawcall);

    //Transparency/Depth test type stuff.
    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Binding of children.
    // HACKY SHIT ALERT:
    // It's important that, in the case of conflict over texture unit
    // with the drawcall (whenever we use the internal uniforms),
    // that we overwrite the appropriate units.
    // I should probably come up with a better way of dynamically dealing with this.
    // Color Pass : 0
    // Brush Texture : 1
    // Size pass : 2
    // Orientation pass : 3
    gl.activeTexture(gl.TEXTURE0);
    this.ColorPass.framebuffer.bindTexture();
    gl.activeTexture(gl.TEXTURE2);
    this.SizePass.framebuffer.bindTexture();
    gl.activeTexture(gl.TEXTURE3);
    this.OrientationPass.framebuffer.bindTexture();
      this.shader.setUniforms({
        "uColorTexture" : 0,
        "uBrushTexture" : 1,
        "uSizeTexture" : 2,
        "uOrientationTexture" : 3
      });

    // Normal Implementation
    if (this.lastframe != NPR.frame) {
      this.lastframe = NPR.frame;
      this.updateFramebuffer(drawcall);
    }
    NPR.DrawTexture(this.framebuffer.texture);
  }

}

NPR.PainterlyBillboardPass.prototype = Object.create(NPR.RenderPass.prototype);