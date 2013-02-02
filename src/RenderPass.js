var NPR = NPR || {};

//
// Class RenderPass.
//
// A RenderPass is a wrapper around a shader and a framebuffer, used for
// deferred rendering.  In general this functionality is simple to create with
// a Shader and a Framebuffer, but this class exists as a convenience, and a point
// to create subclasses with predefined functionality.
//
// In order to use a RenderPass that is more than just post process pass, you must define
// a draw call that takes an overriding shader as an argument.
//

NPR.RenderPass = function(shader) {
  this.shader = shader;
  // Framebuffer initialization.
  this.framebuffer = new NPR.Framebuffer();
}

// The main API draw function.  If the internal buffer is not updated, update it.
// Then draw to the screen as a quad.
NPR.RenderPass.prototype.draw = function(drawcall) {
  if (this.lastframe != NPR.frame) {
    this.lastframe = NPR.frame;
    this.updateFramebuffer(drawcall);
  }
  NPR.DrawTexture(this.framebuffer.texture);
}

// Draws the scene to the internal framebuffer.
NPR.RenderPass.prototype.updateFramebuffer = function(drawcall) {
  var gl = NPR.gl;
  this.framebuffer.bind();
  gl.viewport(0, 0, this.framebuffer.fbo.width, this.framebuffer.fbo.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  this.drawImmediate(drawcall);
  this.framebuffer.release();
}

// Draws immediately, rather than to the internal framebuffer.
NPR.RenderPass.prototype.drawImmediate = function(drawcall) {
  if (drawcall) drawcall(this.shader); else this.drawCall(this.shader);
}

// Sets the drawing function that is used when draw() is called without any arguments.
// drawcall should be a function that draws the scene and takes an override Shader as a parameter.
NPR.RenderPass.prototype.setDrawCall = function(drawcall) { this.drawCall = drawcall; }

NPR.RenderPass.prototype.setUniforms = function(vals) { 
  this.shader.setUniforms(vals);
}
NPR.RenderPass.prototype.setMatrixUniforms = function(mvMatrix, pMatrix, nMatrix) {
  this.shader.setMatrixUniforms(mvMatrix, pMatrix, nMatrix);
}

NPR.RenderPass.prototype.bindTexture = function() {
  this.framebuffer.bindTexture();
}

//
// Class PostProcessPass.
//
// A PostProcessRenderPass is a RenderPass that operates only on textures.
// While a RenderPass will frequently use other passes as textures to synthesize an effect,
// a PostProcessPass is guaranteed to be drawing a fullscreen quad, 
// and so does not require a draw callback.
//

NPR.PostProcessPass = function() {
  // TODO: IMPLEMENT THIS CLASS.
}

NPR.PostProcessPass.prototype = Object.create(NPR.RenderPass.prototype);