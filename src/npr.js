// This is the base utility file for NPR.
var NPR = NPR || {};

NPR.init = function(gl) {
  NPR.gl = gl;
  // Frame counter.
  NPR.frame = 0;
  
  // Singleton full screen quad used all over.
  var ScreenQuad = {};
  var verts = [
      -1, -1, 0,
       1, -1, 0,
  		 1,  1, 0,
  		 1,  1, 0,
  		-1,  1, 0,
  		-1, -1, 0];
  var texs = [
      0, 1,
      1, 1,
      1, 0,
      1, 0,
      0, 0,
      0, 1];
  ScreenQuad.VertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, ScreenQuad.VertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  ScreenQuad.VertexPositionBuffer.itemSize = 3;
  ScreenQuad.VertexPositionBuffer.numItems = 6;
  ScreenQuad.TextureCoordinateBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, ScreenQuad.TextureCoordinateBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texs), gl.STATIC_DRAW);
  ScreenQuad.TextureCoordinateBuffer.itemSize = 2;
  ScreenQuad.TextureCoordinateBuffer.numItems = 6;
  NPR.ScreenQuad = ScreenQuad;

  var TextureShader = new NPR.TextureShader();
  NPR.TextureShaderSingleton = TextureShader;

  // Draw a textured quad to the screen.
  NPR.DrawTexture = function(tex, scale) {
  	var gl = NPR.gl;
    scale = scale || [1,1];
  	gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    var identity = mat4.create();
    mat4.identity(identity);
    TextureShader.setUniforms({
      "uMVMatrix" : identity,
      "uPMatrix" : identity,
      "uTexture" : 0,
      "uScale" : scale
    })
    TextureShader.drawModel(NPR.ScreenQuad);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
  }

  // This function takes a list of attributes, and interleaves them into a texture.
  // The main usage of this is to store per-instance variables when each instance contains multiple vertices.
  // Note that since WebGL does not support drawInstanced, you must also make a per-vertex instance id attribute.
  // All arrays are assumed to be made of the same number components of the same length, either Vec3 or Vec4.
  // They are encoded as a floating point texture, so the OES_texture_float extension must exist.
  NPR.MakeAttributeTexture = function(arrays) {
    // First, get some info and build the array.
    // The number of attributes.
    var num_attrs = arrays.length;
    if (num_attrs)
    // The length of each attribute (i.e. attributes for how many instances?).
    var attr_length = arrays[0].length;
    // The depth of each attribute (generally 3 or 4).
    var attr_depth = arrays[0][0].length;
    if (attr_depth!=3 && attr_depth!=4) throw "AttributeTextures must have 3 or 4 channels.";
    var total_elements = num_attrs * attr_length;
    // Get the smallest power of two, N, such that N^2 <= total_elements.
    var tex_dim = 1;
    while (tex_dim*tex_dim < total_elements) tex_dim = tex_dim << 1;
    var data = [];
    var ptr = 0;
    for (var i = 0; i < attr_length; i++) {
      // For this instance index, add each interleaved attribute.
      for (var a = 0; a < num_attrs; a++) {
        var attrval = arrays[a][i];
        // Add each channel.
        for (var d = 0; d < attr_depth; d++) {
          data[ptr] = attrval[d];
          ++ptr;
        }
      }
    }
    // Now fill up all the remaining space in our texture-to-be with 0.
    for (var i = ptr; i < tex_dim*tex_dim*attr_depth; i++) {
      data[i] = 0.1;
    }

    // Pass the data to the GPU.
    var gl = this.gl;
    if (!gl.getExtension('OES_texture_float')) throw "OES_texture_float required for NPR.MakeAttributeTexture";
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    var gltype = attr_depth==3 ? gl.RGB : gl.RGBA;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gltype, tex_dim, tex_dim, 0,
                  gltype, gl.FLOAT, new Float32Array(data));
    gl.bindTexture(gl.TEXTURE_2D, null);
    tex.dim = tex_dim;
    return tex;
  }

} // End NPR.init.

NPR.update = function() { NPR.frame++; }