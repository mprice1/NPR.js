// Javascript Document.

var NPR = NPR || {};

//
//  This file provides functions that assist in making WebGL applications
//  in general, and adds them to the NPR object.  These functions should not be
//  necessary for using NPR.js in an application.
//
//  Matrix utilities require https://github.com/toji/gl-matrix.
//
//  To use the built-in animation tick() function, draw() (or drawScene()) and update()
//  should be defined in the global scope. 
//

(function() {

//
// General WebGL utilities.
//

// Initialize GL and commence the event loop.
// It is reasonable to call initGL() and start() separately.
// Keep in mind that it is still necessary to call NPR.update() in your update function.
NPR.start = function(canvas) {
  document.onkeydown = NPR.handleKeyDown;
  document.onkeyup = NPR.handleKeyUp;
  if (!NPR.gl && canvas) NPR.initGL(canvas);
  NPR.init(NPR.gl);
  if ((window.drawScene || window.draw) && window.update) NPR.requestAnimFrame.call(window ,NPR.tick);
}

// Initializes the NPR.gl member given a canvas object,
// returns the gl context created.
NPR.initGL = function(canvas) {
  try {	
    var gl = canvas.getContext("experimental-webgl", {"preserveDrawingBuffer" : true});
	gl.viewportWidth = canvas.width;
	gl.viewportHeight = canvas.height;
	NPR.gl = gl;
	return gl;
  } catch(e) {}
  if (!gl) {
	alert("Couldn't initialize WebGL.");
  }
}

// Request animation frame, to trigger the update/draw loop only when the tab is visible.
// If the built in tick() -> update(), draw() event loop is used, you should never need to call
// this function directly.
NPR.requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame ||
         window.oRequestAnimationFrame ||
         window.msRequestAnimationFrame ||
         function(/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
           window.setTimeout(callback, 1000/60);
         };
})();

NPR.tick = function() {
	if ((window.drawScene || window.draw) && window.update) NPR.requestAnimFrame.call(window ,NPR.tick);
  if (window.drawScene) drawScene();
    else if (window.draw) draw();
	if (window.update) update();
}

//
// Keyboard interaction utilities.
//

// The currently pressed keys.
NPR.keys = {};
NPR.handleKeyDown = function(event) {
  NPR.keys[event.keyCode] = true;
}
NPR.handleKeyUp = function(event) {
  NPR.keys[event.keyCode] = false;	
}

//
//  Matrix Stack Utilities.
//  This was developed with https://github.com/toji/gl-matrix in mind as a
//  matrix library.
//

// Modelview and Projection matrices.
// Only the Modelview has a built in stack.
NPR.mvMatrixStack = [];
NPR.mvMatrix = mat4.create();
NPR.pMatrix = mat4.create();
mat4.identity(NPR.mvMatrix);
mat4.identity(NPR.pMatrix);
  
NPR.mvPushMatrix = function() {
  var copy = mat4.create();
  mat4.set(NPR.mvMatrix, copy);
  NPR.mvMatrixStack.push(copy);
}

NPR.mvPopMatrix = function() {
  if (NPR.mvMatrixStack.length == 0) {
    throw "Invalid popMatrix.";
  }
  NPR.mvMatrix = NPR.mvMatrixStack.pop();
}

//
//  Texture loading utilities.
//

// Loads a texture from a url asynchronously.
// Parameter handler is an optional callback to pass the texture to the GPU.
// Otherwise a reasonable default handler will be used.
NPR.loadTexture = function(src, handler) {
  var gl = NPR.gl;
  var tex = gl.createTexture();
  tex.image = new Image();
  if (handler) {
  	tex.image.onload = function() {
      handler(tex);
  	}
  } else {
    tex.image.onload = function() {
      tex.image.loaded = true;
      NPR.handleLoadedTexture(tex);
    }
  }
  tex.image.src = src;
  return tex;
}

// A reasonable default handler to bind an image as a texture on the GPU.
NPR.handleLoadedTexture = function(texture) {
  var gl = NPR.gl;
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, null);
}

NPR.loadCustomMipmap = function(srcs) {
  var gl = NPR.gl;
  var tex = gl.createTexture();
  tex.images = [];
  var num_levels = srcs.length;
  var levels_to_load = num_levels;
  for (var i = 0; i < num_levels; i++) {
    tex.images[i] = new Image();
    tex.images[i].src = srcs[i];
    tex.images[i].onload = mipHandler(i, tex);    
  }
  return tex;

  function mipHandler(level, texture) {
  return function() {
    levels_to_load--;
    // Only after every level is loaded do we pass to the GPU.
    if (levels_to_load == 0) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); 
      for (var i = 0; i < texture.images.length; i++) {
        gl.texImage2D(gl.TEXTURE_2D, i, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.images[i]);
        if (i==0) { gl.generateMipmap(gl.TEXTURE_2D);}
      }         
      gl.bindTexture(gl.TEXTURE_2D, null);      
    }
  };
  }
} 

NPR.canvasTexture = function(canvas) {
  var gl = NPR.gl;
  var tex = gl.createTexture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}

})() // End anonymous function.

