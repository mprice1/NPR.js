// Optical flow toy.

// Contexts.
var canvas;
var video;
var gl;

// Assets.
var texs = {};
var fbos = {};
var shaders = {};
var video_textures = [];
var particle_attrtex_fbos = [];
var curtex;
var particles;

var FLOW_FRAMES = 3;
var tex_offset = FLOW_FRAMES - 1;
var flow_update_framerate = 10;
var particle_alt = false;

var px, py, x, y;
var mousedown = false;
var params;
// If true, we draw something special to the main framebuffer.
var reset_accum = true;

var advect_vert_src = "\
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
  }";

var advect_frag_src = "\
  #ifdef GL_ES\n\
    precision highp float;\n\
  #endif\n\
  uniform sampler2D uFlowTexture;\
  uniform sampler2D uWebcamTexture;\
  uniform sampler2D uAccumTexture;\
  uniform float uFlowScale;\
  uniform float uClock;\
  \
  varying vec2 vTexCoord;\
  \
  void main(void) {\
    vec2 flow = texture2D(uFlowTexture, vec2(1.0 - vTexCoord.x, vTexCoord.y)).xy;\
    flow = 2.0 * flow - vec2(1.0, 1.0);\
    flow = -flow;\
    if (length(flow) < 0.005) flow = vec2(0.0, 0.0);\
    vec2 tc = vTexCoord - flow * uFlowScale;\
    vec4 webcam_color = texture2D(uWebcamTexture, vec2(1.0,1.0) - vTexCoord);\
    vec4 accum_color = texture2D(uAccumTexture, vec2(tc.x, 1.0 - tc.y));\
    gl_FragColor = mix(webcam_color, accum_color, min(1.0, length(flow)*length(flow)*32300.0));\
  }";

  //
  // Simple shader for 2d points.
  //
  var pt_vert_src = "\
    attribute float aInstanceId;\
    \
    uniform sampler2D uAttrTex;\
    uniform float uAttrTexDim;\
    \
    vec2 attrTexCell(float idx) {\
      float r = floor(idx / uAttrTexDim);\
      float c = mod(idx, uAttrTexDim);\
      float drc = 0.5 / uAttrTexDim;\
      vec2 attrTc = vec2(c / uAttrTexDim + drc, r / uAttrTexDim + drc);\
      return attrTc;\
    }\
    \
    void main(void) {\
      gl_PointSize = 1.0;\
      vec4 attrCol = texture2D(uAttrTex, attrTexCell(aInstanceId));\
      gl_Position = vec4(attrCol.xy, aInstanceId / 100.0, 1.0);\
    }\
  "
  var pt_frag_src = "\
  precision mediump float;\
  uniform vec3 uCol;\
  \
  void main(void) {\
    gl_FragColor = vec4(uCol,1.0);\
  }\
  "

  var pt_advect_vert_src = "\
  attribute vec3 aVertexPosition;\
  attribute vec2 aVertexTexcoord;\
  \
  varying vec2 vTexCoord;\
  \
  void main(void) {\
    vTexCoord = aVertexTexcoord;\
    gl_Position = vec4(aVertexPosition, 1.0);\
  }";

  var pt_advect_frag_src = "\
  #ifdef GL_ES\n\
    precision highp float;\n\
  #endif\n\
  uniform sampler2D uFlowTexture;\
  uniform sampler2D uAttrTex;\
  uniform sampler2D uAttrTexDim;\
  uniform float uFlowScale;\
  \
  varying vec2 vTexCoord;\
  \
  void main(void) {\
    vec3 attr = texture2D(uAttrTex, vTexCoord).xyz;\
    vec2 pos = attr.xy;\
    \
    vec2 flow = texture2D(uFlowTexture, vTexCoord).xy;\
    flow = 2.0 * flow - vec2(1.0, 1.0);\
    flow = -flow;\
    if (length(flow) < 0.005) flow = vec2(0.0, 0.0);\
    \
    vec2 newpos = pos + uFlowScale * flow;\
    gl_FragColor = vec4(newpos, 0.0, 1.0);\
  }";

function init() {
  canvas = document.getElementById('main_canvas');
  canvas.width = 640;  canvas.height = 480;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  NPR.start(canvas);
  gl = NPR.gl;

  texs['brick'] = NPR.loadTexture('../../images/brick.jpg');
  for (var i = 0; i < FLOW_FRAMES; i++) {
    gl.activeTexture(gl.TEXTURE0 + i);
    video_textures[i] = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, video_textures[i]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  shaders['flow'] = new NPR.OpticalFlowShader();
  shaders['advect'] = new NPR.Shader(advect_vert_src, advect_frag_src);
  shaders['advect'].attributes = {
    "VertexPositionBuffer" : gl.getAttribLocation(shaders['advect'].program, "aVertexPosition"),
    "TextureCoordinateBuffer" : gl.getAttribLocation(shaders['advect'].program, "aVertexTexcoord")
  }
  shaders['pts'] = new NPR.Shader(pt_vert_src, pt_frag_src);
  shaders['pts'].attributes = {"VertexIndexBuffer" : gl.getAttribLocation(shaders['pts'].program, "aInstanceId")};
  shaders['pt_advect'] = new NPR.Shader(pt_advect_vert_src, pt_advect_frag_src);
  shaders['pt_advect'].attributes = {
    "VertexPositionBuffer" : gl.getAttribLocation(shaders['advect'].program, "aVertexPosition"),
    "TextureCoordinateBuffer" : gl.getAttribLocation(shaders['advect'].program, "aVertexTexcoord")
  }

  fbos['flow'] = new NPR.Framebuffer();
  fbos['main'] = new NPR.Framebuffer();
  initWebcam();
  initBrush();
  initParams();
  initParticles();

  window.onresize = function() {
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
}

function initParams() {
  params = {
    "flow_scale": 0.3,
    "sample_reach": 1.0,
    "display": 'advect_webcam',
    "lock_framerate": false,
    "reset_buffer": function(){reset_accum = true;},
    "reset_particles": resetParticles
  };
  var gui = new dat.GUI();
  gui.add(params, "flow_scale", 0, 2);
  gui.add(params, "sample_reach", 0.1, 5);
  gui.add(params, 'display', { advect_webcam: "effect", advect_texture: "tex", flow: "flow", particles_only: "particles_only" } ).onChange(params.reset_buffer);
  gui.add(params, 'lock_framerate');
  gui.add(params, 'reset_buffer');
  gui.add(params, 'reset_particles');
}

function curTex() {
  if (params.display == 'tex') {
    return texs['brick'];
  }
  return video_textures[tex_offset];
}

function initBrush() {
  canvas.onmousedown = function(e) {
    mousedown = true;
    px = x; py = y; x = e.clientX; y = e.clientY;
  }
  document.onmouseup = function(e) {
      mousedown = false;
  }
  document.onmousemove = function(e) { 
    if(mousedown) {
      px = x; py = y; x = e.clientX; y = e.clientY;
    }
  }
}

function initWebcam() {
  var webcam = document.createElement('video');
  video = webcam;
  webcam.setAttribute('autoplay', '1');
  navigator.webkitGetUserMedia({'video' : true},
      function(stream) {
        webcam.src = window.webkitURL.createObjectURL(stream);
      },
      function(err) {
        console.log("Unable to get video stream!")
      });
}

function initParticles() {
  // Make attribute texture.
  var positions = [];
  particle_grid_dim = 100;
  for (var i = -1; i <= 1; i += (1 / particle_grid_dim)) {
    for (var j = -1; j <= 1; j += (1 / particle_grid_dim)) {
      positions.push([i, j, 0]);
    }
  }
  texs['particle_attr'] = NPR.MakeAttributeTexture([positions]);
  
  // Make attribute fbos.
  var particle_fbo_params = { 
    "width"         : texs["particle_attr"].dim,
    "height"        : texs["particle_attr"].dim,
    "type": gl.FLOAT,
    "channelFormat" : gl.RGB,
    "hasDepth"      : false
  };
  fbos['particle_1'] = new NPR.Framebuffer(particle_fbo_params);
  fbos['particle_2'] = new NPR.Framebuffer(particle_fbo_params);
  resetParticles();
  // TODO: Delete texture

  // Make instance buffer.
  var ids = [];
  for (var i = 0; i < positions.length; i++) { ids.push(i); }
  var instanceIDBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceIDBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ids), gl.STATIC_DRAW);
  instanceIDBuffer.itemSize = 1;
  instanceIDBuffer.numItems = ids.length;
  particles = {"VertexIndexBuffer": instanceIDBuffer};
}

function drawParticles() {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, particle_alt ? fbos['particle_2'].texture : fbos['particle_1'].texture);
  shaders['pts'].bind();
  shaders['pts'].setUniforms({
    "uAttrTex": 0,
    "uAttrTexDim": texs['particle_attr'].dim,
    "uCol": particle_alt ? [1,0,0] : [0,1,0]
  });
  shaders['pts'].drawModel(particles, gl.POINTS, "VertexIndexBuffer");
}

function updateParticles() {
  var read_particles = particle_alt ? fbos['particle_2'].texture : fbos['particle_1'].texture;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, read_particles);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, fbos['flow'].texture);
  var write_particles = particle_alt ? fbos['particle_1'] : fbos['particle_2'];
  write_particles.bind();
  shaders['pt_advect'].setUniforms({
  "uFlowTexture": 1,
  "uAttrTex": 0,
  "uAttrTexDim": texs['particle_attr'].dim,
  "uFlowScale": params.flow_scale
  });
  shaders['pt_advect'].drawModel(NPR.ScreenQuad);
  write_particles.release();
}

function resetParticles() {
  gl.disable(gl.DEPTH_TEST);
  fbos['particle_1'].bind();
  NPR.DrawTexture(texs["particle_attr"]);
  fbos['particle_1'].release();
  fbos['particle_2'].bind();
  NPR.DrawTexture(texs["particle_attr"]);
  fbos['particle_2'].release();
}

function updateVideoTexture() {
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    tex_offset++;
    tex_offset %= FLOW_FRAMES;
    gl.activeTexture(gl.TEXTURE0 + tex_offset);
    gl.bindTexture(gl.TEXTURE_2D, video_textures[tex_offset]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
          gl.UNSIGNED_BYTE, video);
  }
}

function update() {
  NPR.update();
  if (NPR.frame % flow_update_framerate == 0) {
    updateVideoTexture();
  }
}

function drawBrush(x, y) {
  var identity = mat4.identity(mat4.create());
  var mv = mat4.identity(mat4.create());
  mat4.translate(mv, [(x * 2 / window.innerWidth) - 1 , (y * 2 / window.innerHeight) - 1, 0]);
  mat4.scale(mv, [.1, .1, 1]);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texs['brick']);
  NPR.TextureShaderSingleton.setUniforms({
    "uMVMatrix": mv,
    "uTexture": 0,
    "uScale" : [1,1]
  });
  NPR.TextureShaderSingleton.drawModel(NPR.ScreenQuad);
}

function draw() {
  gl.disable(gl.DEPTH_TEST);
  var identity = mat4.identity(mat4.create());
  if (NPR.frame % flow_update_framerate == 0) {
    idx0 = (tex_offset + FLOW_FRAMES - 2) % FLOW_FRAMES;
    idx1 = (tex_offset + FLOW_FRAMES - 1) % FLOW_FRAMES;
    idx2 = tex_offset;
    gl.activeTexture(gl.TEXTURE0 + idx0);
    gl.bindTexture(gl.TEXTURE_2D, video_textures[idx0]);
    gl.activeTexture(gl.TEXTURE0 + idx1);
    gl.bindTexture(gl.TEXTURE_2D, video_textures[idx1]);
    gl.activeTexture(gl.TEXTURE0 + idx2);
    gl.bindTexture(gl.TEXTURE_2D, video_textures[idx2]);
    shaders['flow'].bind();
    shaders['flow'].setUniforms({
      "uTexture0": idx0,
      "uTexture1": idx1,
      "uTexture2": idx2,
      "uMVMatrix": identity,
      "uPMatrix": identity,
      "uTexDim": [canvas.width, canvas.height],
      "uSampleReach": params.sample_reach
    });
    fbos['flow'].bind();
    shaders['flow'].drawModel(NPR.ScreenQuad);
    fbos['flow'].release();
  }

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, fbos['flow'].texture);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, fbos['main'].texture);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, curTex());
  shaders['advect'].setUniforms({
    "uMVMatrix": identity,
    "uPMatrix": identity,
    "uFlowTexture": 0,
    "uAccumTexture" : 1,
    "uWebcamTexture": 3,
    "uClock": Math.sin(NPR.frame / 100),
    "uFlowScale": params.flow_scale
  });

  fbos['main'].bind();
  if (reset_accum) {
    reset_accum = false;
    NPR.DrawTexture(curTex(), [-1,-1]);
  } else {
    if (params.lock_framerate && NPR.frame % flow_update_framerate != 0) {
      NPR.DrawTexture(fbos['main'].texture, [1, -1]);
    } else {
      shaders['advect'].drawModel(NPR.ScreenQuad);
    }
  }
  if (mousedown) {
    drawBrush(x, y);
  }
  fbos['main'].release();
  drawParticles();
  updateParticles();
  particle_alt = !particle_alt;
  switch(params.display) {
    case 'flow':
      NPR.DrawTexture(fbos['flow'].texture, [-1, -1]);
      break;
    case 'particles_only':
      /*gl.clearColor(0,0,0,1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      drawParticles();*/
      NPR.DrawTexture(fbos[particle_alt ? 'particle_2' : 'particle_1'].texture);
      break;
    default:
      NPR.DrawTexture(fbos['main'].texture);
      break;
  }
  
}