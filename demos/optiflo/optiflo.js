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

var FLOW_FRAMES = 3;
var tex_offset = FLOW_FRAMES - 1;
var flow_update_framerate = 5;

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
  uniform sampler2D uTexture;\
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
    flow.x = flow.x;\
    vec2 tc = vTexCoord - flow * uFlowScale;\
    vec4 webcam_color = texture2D(uWebcamTexture, vec2(1.0,1.0) - vTexCoord);\
    vec4 bgtex = texture2D(uTexture, vTexCoord * vec2(2.0,2.0));\
    vec4 accum_color = texture2D(uAccumTexture, vec2(tc.x, 1.0 - tc.y));\
    gl_FragColor = mix(webcam_color, accum_color, min(1.0, length(flow)*length(flow)*10000.0));\
  }";

function init() {
  canvas = document.getElementById('main_canvas');
  canvas.width = document.width;  canvas.height = document.height;
  canvas.style.width = document.width + "px";
  canvas.style.height = document.height + "px";
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

  //if (!gl.getExtension('OES_texture_float')) throw "uh oh";
  fbos['flow'] = new NPR.Framebuffer(/*{'type' : gl.FLOAT}*/);
  fbos['main'] = new NPR.Framebuffer();
  initWebcam();
  initBrush();
  initParams();
}

function initParams() {
  params = {
    "flow_scale": 0.1,
    "sample_reach": 1.0,
    "display": 'effect',
    "reset_accum": function(){reset_accum = true;}
  };
  var gui = new dat.GUI();
  gui.add(params, "flow_scale", 0, 1);
  gui.add(params, "sample_reach", 1, 15);
  gui.add(params, 'display', { effect: "effect", flow: "flow" } );
  gui.add(params, 'reset_accum');
}

function initBrush() {
  // Mouse position relative to a canvas element.
  function getMousePos(canvas, event) {
    var cc = canvas;
    var top = 0;
    var left = 0;
    while (cc && cc.tagName != 'BODY') {
        top += cc.offsetTop;
        left += cc.offsetLeft;
        cc = cc.offsetParent;
    }
    var mouseX = event.clientX - left + window.pageXOffset;
    var mouseY = event.clientY - top + window.pageYOffset;
    return {
        x: mouseX,
        y: mouseY
    };
}
  canvas.onmousedown = function(e) {
    console.log('d');
    mousedown = true;
    var p = getMousePos(canvas, e);
    px = x; py = y; x = p.x; y = p.y;
  }
  document.onmouseup = function(e) {
      mousedown = false;
  }
  document.onmousemove = function(e) { 
    if(mousedown) {
      var p = getMousePos(canvas, e);
      px = x; py = y; x = p.x; y = p.y;
    }
  }
}

function initWebcam() {
  var webcam = document.createElement('video');
  video = webcam;
  webcam.setAttribute('autoplay', '1');
  (navigator.webkitGetUserMedia || navigator.mozGetUserMedia)({'video' : true},
      function(stream) {
        webcam.src = window.webkitURL.createObjectURL(stream);
      },
      function(err) {
        console.log("Unable to get video stream!")
      });
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
  mat4.translate(mv, [(x * 2 / canvas.width) - 1 , (y * 2 / canvas.height) - 1, 0]);
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
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, texs['brick']);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, video_textures[tex_offset]);
  shaders['advect'].setUniforms({
    "uMVMatrix": identity,
    "uPMatrix": identity,
    "uFlowTexture": 0,
    "uAccumTexture" : 1,
    "uTexture": 2,
    "uWebcamTexture": 3,
    "uClock": Math.sin(NPR.frame / 100),
    "uFlowScale": params.flow_scale
  });
  fbos['main'].bind();
  if (reset_accum) {
    reset_accum = false;
    NPR.DrawTexture(video_textures[tex_offset], [-1,-1]);
  } else {
    shaders['advect'].drawModel(NPR.ScreenQuad);
  }
  //if (mousedown) {
    drawBrush(x, y);
  //}
  fbos['main'].release();
  switch(params.display) {
    case 'effect':
      NPR.DrawTexture(fbos['main'].texture);
      break;
    case 'flow':
      NPR.DrawTexture(fbos['flow'].texture, [-1, -1]);
      break;
  }
  
}