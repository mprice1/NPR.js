var NPR = NPR || {};

//
//  Class Framebuffer.
//

NPR.Framebuffer = function(params) {
	var gl = NPR.gl;

	// Set parameters, either from defaults or from paremeter object.
	if (params) {
		var width = params.width;
		var height = params.height;
		var type = params.type;
		var channelFormat = params.channelFormat;
		var do_depth = params.hasDepth;
	} else {
		var width = gl.viewportWidth;
		var height = gl.viewportHeight;
		var type = gl.UNSIGNED_BYTE;
		var channelFormat = gl.RGBA;
		var do_depth = true;
	}

	// fbo is the actual WebGL FramebufferObject, for which this is a wrapper.
	this.fbo = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
	
	// By default, we make a framebuffer the size of the viewport
	// with a standard color and depth attatchment.
	this.fbo.width = width;
	this.fbo.height = height;

	// Texture for the Color attachment.
	this.texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, this.texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	// These texture parameters work with NPOT textures.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, channelFormat, this.fbo.width, this.fbo.height, 0, channelFormat, type, null);
    // Bind to fbo.
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

    if (do_depth) {
      // Renderbuffer for the Depth attachment.
      var depth_renderbuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, depth_renderbuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.fbo.width, this.fbo.height);
      // Bind to fbo.
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth_renderbuffer);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

NPR.Framebuffer.prototype.bind = function() {
	var gl = NPR.gl;
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
}

NPR.Framebuffer.prototype.release = function() {
	var gl = NPR.gl;
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

NPR.Framebuffer.prototype.bindTexture = function() {
	var gl = NPR.gl;
	gl.bindTexture(gl.TEXTURE_2D, this.texture);
}

//
//  Class FramebufferParams.
//  This is just a container for a number of parameters.
//

NPR.FrameBufferParams = function(width, height, hasDepth, channelFormat, type) {
	var gl = NPR.gl;
	this.width = width ? width : gl.viewportWidth;
	this.height = height ? height : gl.viewportHeight;
	this.hasDepth = hasDepth==undefined ? true : !!hasDepth;
	this.channelFormat = channelFormat ? channelFormat : gl.RGBA; 
	this.type = type ? type : gl.UNSIGNED_BYTE;
}