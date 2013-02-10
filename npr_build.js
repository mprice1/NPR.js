//////////////////////////////////////
// src\BillboardUtils.js
//////////////////////////////////////
var NPR = NPR || {};

//
// This file contains utility functions for working with billboards.
//

// Given a number of instances, creates the required geometry buffers to draw instanced
// billboards.  Each billboard is made of two triangles and makes a 2d unit square centered
// at the origin.  This also produces an InstanceID vertex attribute that is the billboard
// instance for each vertex.
// Rather than waste another vertex buffer for texture coordinates, it is assumed that the 
// vertex position + vec2(0.5, 0.5) will be used in the shader for texture lookups.
NPR.createInstancedBillboardBuffers = function(gl, num_billboards) {
  var squarePoly = new NPR.Triangles();
  squarePoly.addPoint(-.5,  .5);
  squarePoly.addPoint(-.5, -.5);
  squarePoly.addPoint( .5,  .5);
  squarePoly.addPoint( .5,  .5);
  squarePoly.addPoint(-.5, -.5);
  squarePoly.addPoint( .5, -.5);
  return squarePoly.makeInstancedVertexBuffer(gl, num_billboards);
}
//////////////////////////////////////
// src\Framebuffer.js
//////////////////////////////////////
var NPR = NPR || {};

//
//  Class Framebuffer.
//

NPR.Framebuffer = function(params) {
	var gl = NPR.gl;

	// Set parameters, either from defaults or from paremeter object.
  params = params || {};
  var width = params.width || gl.viewportWidth;
	var height = params.height || gl.viewportHeight;
	var type = params.type || gl.UNSIGNED_BYTE;
	var channelFormat = params.channelFormat || gl.RGBA;
	var do_depth = params.hasDepth !== undefined ? params.hasDepth : true;

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
//////////////////////////////////////
// src\Mesh.js
//////////////////////////////////////
var NPR = NPR || {};

NPR.Mesh = function() {
	var gl = NPR.gl;
	this.loaded = false;
}

//  Gets a JSON model from a url and builds buffers.
NPR.Mesh.prototype.load = function(url, onload) {
  var that = this;
  var request = new XMLHttpRequest();
  request.open("GET", url);
  request.onreadystatechange = function() {
    if (request.readyState == 4) {
      var data = JSON.parse(request.responseText);
      // Note that these are fla
      that.positions = data.vertexPositions;
      that.normals   = data.vertexNormals;
      that.texcoords = data.vertexTextureCoords;
      that.indices   = data.indices;
      that.makeBuffers();
      that.loaded = true;
      onload();
    }
  }
  request.overrideMimeType("application/json");
  request.send();
}

// Makes VBOs from the loaded data arrays.
NPR.Mesh.prototype.makeBuffers = function() {
	var gl = NPR.gl;

	// Vertices
	if (this.positions) {
	  if (this.VertexPositionBuffer) gl.deleteBuffer(this.VertexPositionBuffer);
	  this.VertexPositionBuffer = gl.createBuffer();
	  gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
	  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positions), gl.STATIC_DRAW);
	  this.VertexPositionBuffer.itemSize = 3;
	  this.VertexPositionBuffer.numItems = this.positions.length / 3;
	}

	// Normals
    if (this.normals) {
      if (this.VertexNormalBuffer) gl.deleteBuffer(this.VertexNormalBuffer);
      this.VertexNormalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,  this.VertexNormalBuffer);
	  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
	  this.VertexNormalBuffer.itemSize = 3;
	  this.VertexNormalBuffer.numItems = this.normals.length / 3;
	}

	// Texture Coordinates
	if (this.texcoords) {
	  if (this.TextureCoordinateBuffer) gl.deleteBuffer(this.TextureCoordinateBuffer);
	  this.TextureCoordinateBuffer = gl.createBuffer();
	  gl.bindBuffer(gl.ARRAY_BUFFER, this.TextureCoordinateBuffer);
	  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.texcoords), gl.STATIC_DRAW);
	  this.TextureCoordinateBuffer.itemSize = 2;
	  this.TextureCoordinateBuffer.numItems = this.texcoords.length / 2;
	}
	
	// Vertex Indices
	if (this.indices) {
	  if (this.VertexIndexBuffer) gl.deleteBuffer(this.VertexIndexBuffer);
  	  this.VertexIndexBuffer = gl.createBuffer();
	  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.VertexIndexBuffer);
	  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
	  this.VertexIndexBuffer.itemSize = 1;
	  this.VertexIndexBuffer.numItems = this.indices.length;
	}
}

// Returns uniformly randomly sampled points from the surface of this mesh,
// as well as their (smoothly interpolated) normals.
NPR.Mesh.prototype.getRandomSamples = function(num_samples) {
	// Triangle area via cross product.
    function triangleArea(v1, v2, v3) {
	  var v1x, v1y, v1z, v2x, v2y, v2z, cx, cy, cz;
	  v1x = v2[0]-v1[0];  v1y = v2[1]-v1[1];  v1z = v2[2]-v1[2];
	  v2x = v3[0]-v1[0];  v2y = v3[1]-v1[1];  v2z = v3[2]-v1[2];
	  cx = v1y*v2z - v1z*v2y;
	  cy = v1z*v2x - v1x*v2z;
	  cz = v1x*v2y - v1y*v2x;
	  return Math.sqrt(cx*cx + cy*cy + cz*cz);
	}

	// Random point on a triangle via barycentric coordinates.
	function randomTrianglePoint(v1, v2, v3, n1, n2, n3) {
	  var b1, b2, b3,
	   	   x,  y,  z;
	  b1 = Math.random();
	  b2 = Math.random();
	  if (b1 + b2 > 1) {
		b1 = 1-b1;
		b2 = 1-b2;
	  }
	  b3 = 1 - b1 - b2;
	  x = b1*v1[0] + b2*v2[0] + b3*v3[0];
	  y = b1*v1[1] + b2*v2[1] + b3*v3[1];
	  z = b1*v1[2] + b2*v2[2] + b3*v3[2];
	  nx = b1*n1[0] + b2*n2[0] + b3*n3[0];
	  ny = b1*n1[1] + b2*n2[1] + b3*n3[1];
	  nz = b1*n1[2] + b2*n2[2] + b3*n3[2];
	  return [[x, y, z], [nx, ny, nz]];
    }

    // Begin heavy lifting.
    var verts = this.positions;
    var norms = this.normals;
    var idxs  = this.indices;
    if (!verts || !norms || !idxs) throw [[],[]];

    var tri_list = [];
	// Reshape vert list for ease of indexing.
	var vert_list = [];
	var total_area = 0;
	for (var i = 0; i < verts.length/3; i++) {
		vert_list[i] = [verts[3*i], verts[3*i+1], verts[3*i+2]];
	}
	// And do the same for the list of normals
	var norm_list = [];
	for (var i = 0; i < norms.length/3; i++) {
		norm_list[i] = [norms[3*i], norms[3*i+1], norms[3*i+2]];
	}
	// For each triangle, form it into an index list and annotate with its area.
	for (var i = 0; i < idxs.length; i += 3) {
		var tri = [idxs[i], idxs[i+1], idxs[i+2]];
		tri.area = triangleArea(vert_list[tri[0]], vert_list[tri[1]], vert_list[tri[2]]);
		tri_list[i/3] = tri;
		total_area += tri.area;
	}
	// Sort triangle list by area.
	tri_list.sort(function(a,b){return a.area - b.area;});
	// Make sample list.  While sample list isnt full:
	var sample_list = [];
	var norm_sample_list = [];
	var cur_tri = 0;
	var trisamps = 0;
	while (sample_list.length < num_samples * 3) {
		trisamps += Math.min(/*Math.ceil*/(num_samples * tri_list[cur_tri].area / total_area), (num_samples * 3) - sample_list.length);
		var v1 = vert_list[tri_list[cur_tri][0]];
		var v2 = vert_list[tri_list[cur_tri][1]];
		var v3 = vert_list[tri_list[cur_tri][2]];
		var n1 = norm_list[tri_list[cur_tri][0]];
		var n2 = norm_list[tri_list[cur_tri][1]];
		var n3 = norm_list[tri_list[cur_tri][2]];
		// Go down triangle list, adding proportional number of random points to sample list.
		if (cur_tri == tri_list.length-1) {
		  trisamps = num_samples*3 - sample_list.length;	
		}
		var samps_made = 0;
		if (trisamps > 1) {
		for (var i = 1; i < trisamps; i++) {
			var s = randomTrianglePoint(v1, v2, v3, n1, n2, n3);
			sample_list.push(s[0][0]);
			sample_list.push(s[0][1]);
			sample_list.push(s[0][2]);
			norm_sample_list.push(s[1][0]);
			norm_sample_list.push(s[1][1]);
			norm_sample_list.push(s[1][2]);
			samps_made++;
		}
		}

		trisamps -= samps_made;
		cur_tri++;
	}
	return [sample_list, norm_sample_list];
}  // End Mesh::getRandomSamples().

// Makes a buffer of randomly sampled points and a buffer of their normals and returns them.
// If optional output parameter out_array_container is present, then the actual sample arrays
// will get returned in it.
NPR.Mesh.prototype.getRandomSampleBuffers = function(num_samples, out_array_container) {
	var gl = NPR.gl;
	var lists = this.getRandomSamples(num_samples);
	var sample_list = lists[0];
	var norm_sample_list = lists[1];

	var samplebuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, samplebuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sample_list), gl.STATIC_DRAW);
	samplebuffer.itemSize = 3;
	samplebuffer.numItems = sample_list.length / 3; // Should == num_samples, but just in case...

	var normsamplebuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, normsamplebuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(norm_sample_list), gl.STATIC_DRAW);
	normsamplebuffer.itemSize = 3;
	normsamplebuffer.numItems = norm_sample_list.length / 3; // Should == num_samples, but just in case...

	if (out_array_container) { 
		out_array_container[0] = sample_list;
		out_array_container[1] = norm_sample_list;
	} 
	return [samplebuffer, normsamplebuffer];
}

// Makes the buffers as in getRandomSampleBuffers, but then binds them to the model as
// RandomSampleBuffer and RandomSampleNormalBuffer.
// If optional output parameter out_array_container is present, then the actual sample arrays
// will get returned in it.
NPR.Mesh.prototype.makeRandomSampleBuffers = function(num_samples, out_array_container) {
	if (this.RandomSampleBuffer) NPR.gl.deleteBuffer(this.RandomSampleBuffer);
	if (this.RandomSampleNormalBuffer) NPR.gl.deleteBuffer(this.RandomSampleNormalBuffer);
	var buffers = this.getRandomSampleBuffers(num_samples, out_array_container);
	this.RandomSampleBuffer = buffers[0];
	this.RandomSampleNormalBuffer = buffers[1];
}
//////////////////////////////////////
// src\modelloader.js
//////////////////////////////////////
function handleLoadedModel(data, carrier) {
	 carrier.model = new objmodel(data);
}
function loadModel(url, carrier) {
  var request = new XMLHttpRequest();
  request.open("GET", url);
  request.onreadystatechange = function() {
    if (request.readyState == 4) {
     handleLoadedModel(JSON.parse(request.responseText), carrier);
    }
  }
  request.send();
}

function objmodel(data) {
  var modelVertexPositionBuffer;
  var modelVertexNormalBuffer;	
  var modelVertexTextureCoordBuffer;
  var modelVertexIndexBuffer;
	// Vertices
	modelVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,
								modelVertexPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER,
								new Float32Array(data.vertexPositions),
								gl.STATIC_DRAW);
	modelVertexPositionBuffer.itemSize = 3;
	modelVertexPositionBuffer.numItems =
			data.vertexPositions.length / 3;
			
  // Normals
    modelVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,
								modelVertexNormalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER,
								new Float32Array(data.vertexNormals),
								gl.STATIC_DRAW);
	modelVertexNormalBuffer.itemSize = 3;
	modelVertexNormalBuffer.numItems =
			data.vertexNormals.length / 3;
			
	// Texture Coordinates
	modelVertexTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,
								modelVertexTextureCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER,
								new Float32Array(data.vertexTextureCoords),
								gl.STATIC_DRAW);
	modelVertexTextureCoordBuffer.itemSize = 2;
	modelVertexTextureCoordBuffer.numItems =
			data.vertexTextureCoords.length / 2;
	
	// Vertex Indices
  modelVertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,
								modelVertexIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
								new Uint16Array(data.indices),
								gl.STATIC_DRAW);
	modelVertexIndexBuffer.itemSize = 1;
	modelVertexIndexBuffer.numItems =
			data.indices.length;
	
	this.VertexPositionBuffer = modelVertexPositionBuffer;
	this.VertexNormalBuffer = modelVertexNormalBuffer;
    this.TextureCoordinateBuffer = modelVertexTextureCoordBuffer;
	this.VertexIndexBuffer = modelVertexIndexBuffer;
	
	// Gotta have both!
	if(data.AABBmax && data.AABBmin) {
  	this.AABBmax = data.AABBmax;
		this.AABBmin = data.AABBmin;
		// Make a buffer to draw the AABB as lines for debugging
		var aabb_lines = MakeAABBLines(this.AABBmax, this.AABBmin);
	  this.DebugAABBBuffer = gl.createBuffer();
  	gl.bindBuffer(gl.ARRAY_BUFFER, this.DebugAABBBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(aabb_lines), gl.STATIC_DRAW);
    this.DebugAABBBuffer.itemSize = 3;
    this.DebugAABBBuffer.numItems = 24;
	}
	
	this.draw = drawModel;
	this.drawAABB = drawAABB;
}

function sampledObjModel(data, num_samples) {
	var model = new objmodel(data);
	var buffers = makeRandomSampleBuffers(data.vertexPositions, data.vertexNormals, data.indices, num_samples);
	model.RandomSampleBuffer = buffers[0];
	model.RandomSampleNormalBuffer = buffers[1];
	return model;
}

function MakeAABBLines(AABBmax, AABBmin) {
	lines = [];
	// Lines along z axis.
	assignFlatVec3(lines, 0, AABBmax);
	assignFlatVec3(lines, 1, [AABBmax[0], AABBmax[1], AABBmin[2]]);
	assignFlatVec3(lines, 2, [AABBmax[0], AABBmin[1], AABBmax[2]]);
	assignFlatVec3(lines, 3, [AABBmax[0], AABBmin[1], AABBmin[2]]);
	assignFlatVec3(lines, 4, [AABBmin[0], AABBmin[1], AABBmax[2]]);
	assignFlatVec3(lines, 5, AABBmin);
	assignFlatVec3(lines, 6, [AABBmin[0], AABBmax[1], AABBmax[2]]);
	assignFlatVec3(lines, 7, [AABBmin[0], AABBmax[1], AABBmin[2]]);
	// Lines along x axis.
	assignFlatVec3(lines, 8, [AABBmax[0], AABBmax[1], AABBmin[2]]);
	assignFlatVec3(lines, 9, [AABBmin[0], AABBmax[1], AABBmin[2]]);
	assignFlatVec3(lines, 10, AABBmax);
	assignFlatVec3(lines, 11, [AABBmin[0], AABBmax[1], AABBmax[2]]);
	assignFlatVec3(lines, 12, [AABBmax[0], AABBmin[1], AABBmin[2]]);
	assignFlatVec3(lines, 13, AABBmin);
	assignFlatVec3(lines, 14, [AABBmax[0], AABBmin[1], AABBmax[2]]);
	assignFlatVec3(lines, 15, [AABBmin[0], AABBmin[1], AABBmax[2]]);
	// Lines along y axis.
	assignFlatVec3(lines, 16, [AABBmax[0], AABBmax[1], AABBmin[2]]);
	assignFlatVec3(lines, 17, [AABBmax[0], AABBmin[1], AABBmin[2]]);
	assignFlatVec3(lines, 18, AABBmax);
	assignFlatVec3(lines, 19, [AABBmax[0], AABBmin[1], AABBmax[2]]);
	assignFlatVec3(lines, 20, [AABBmin[0], AABBmax[1], AABBmin[2]]);
	assignFlatVec3(lines, 21, AABBmin);
	assignFlatVec3(lines, 22, [AABBmin[0], AABBmax[1], AABBmax[2]]);
	assignFlatVec3(lines, 23, [AABBmin[0], AABBmin[1], AABBmax[2]]);
	return lines;
}

function assignFlatVec3(list, idx, vec) {
	var offset = 3 * idx;
	list[offset] = vec[0];
	list[offset + 1] = vec[1];
	list[offset + 2] = vec[2];
}

function drawModel(myshader) {
	gl.useProgram(myshader);
	// Bind Vertex Positions
	gl.bindBuffer(gl.ARRAY_BUFFER,
								this.VertexPositionBuffer);
	gl.vertexAttribPointer(
			myshader.vertexPositionAttribute,
			this.VertexPositionBuffer.itemSize,
			gl.FLOAT,
			false,
			0,
			0);
	// Bind Vertex Normals
	gl.bindBuffer(gl.ARRAY_BUFFER,
								this.VertexNormalBuffer);
	gl.vertexAttribPointer(
			myshader.vertexNormalAttribute,
			this.VertexNormalBuffer.itemSize,
			gl.FLOAT,
			false,
			0,
			0);
	// Bind Texture Coordinates
	gl.bindBuffer(gl.ARRAY_BUFFER,
								this.TextureCoordinateBuffer);
  gl.vertexAttribPointer(
			myshader.textureCoordinateAttribute,
			this.TextureCoordinateBuffer.itemSize,
			gl.FLOAT,
			false,
			0,
			0);
  // Bind Vertex Indices
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,
								this.VertexIndexBuffer);
	// Pass Matrices and draw.
	setMatrixUniforms(myshader);
	gl.drawElements(gl.TRIANGLES,
									this.VertexIndexBuffer.numItems,
									gl.UNSIGNED_SHORT,
									0);
}

function drawAABB(myshader) {
	gl.useProgram(myshader);
	// Bind Vertex Positions
	gl.bindBuffer(gl.ARRAY_BUFFER,
								this.DebugAABBBuffer);
	gl.vertexAttribPointer(
			myshader.vertexPositionAttribute,
			this.DebugAABBBuffer.itemSize,
			gl.FLOAT,
			false,
			0,
			0);
	// Pass Matrices and draw.
	setMatrixUniforms(myshader);
	gl.drawArrays(gl.LINES, 0, this.DebugAABBBuffer.numItems);
}

//
// Random sampling stuff.
//

// Triangle area via cross product.
function triangleArea(v1, v2, v3) {
	var v1x, v1y, v1z, v2x, v2y, v2z, cx, cy, cz;
	v1x = v2[0]-v1[0];
	v1y = v2[1]-v1[1];
	v1z = v2[2]-v1[2];
	v2x = v3[0]-v1[0];
	v2y = v3[1]-v1[1];
	v2z = v3[2]-v1[2];
	cx = v1y*v2z - v1z*v2y;
	cy = v1z*v2x - v1x*v2z;
	cz = v1x*v2y - v1y*v2x;
	return Math.sqrt(cx*cx + cy*cy + cz*cz);
}

function randomTrianglePoint(v1, v2, v3, n1, n2, n3) {
	// Barycentric coordinates
	var b1, b2, b3,
		x, y, z;
	b1 = Math.random();
	b2 = Math.random();
	if (b1 + b2 > 1) {
		b1 = 1-b1;
		b2 = 1-b2;
	}
	b3 = 1 - b1 - b2;
	x = b1*v1[0] + b2*v2[0] + b3*v3[0];
	y = b1*v1[1] + b2*v2[1] + b3*v3[1];
	z = b1*v1[2] + b2*v2[2] + b3*v3[2];
	nx = b1*n1[0] + b2*n2[0] + b3*n3[0];
	ny = b1*n1[1] + b2*n2[1] + b3*n3[1];
	nz = b1*n1[2] + b2*n2[2] + b3*n3[2];
	return [[x, y, z], [nx, ny, nz]];
}

// Generate n random samples on the mesh.
// verts: a list of all vertex positions. vert i is verts[3*i],verts[3*i+1],verts[3*i+2]
// idxs: indexes into vert array.  triangle i is idxs[3*i], idxs[3*i+1], idxs[3*i+2].
function getRandomSamples(verts, norms, idxs, num_samples) {
	var tri_list = [];
	// Reshape vert list for ease of indexing.
	var vert_list = [];
	var total_area = 0;
	for (var i = 0; i < verts.length/3; i++) {
		vert_list[i] = [verts[3*i], verts[3*i+1], verts[3*i+2]];
	}
	// And do the same for the list of normals
	var norm_list = [];
	for (var i = 0; i < norms.length/3; i++) {
		norm_list[i] = [norms[3*i], norms[3*i+1], norms[3*i+2]];
	}
	// For each triangle, form it into an index list and annotate with its area.
	for (var i = 0; i < idxs.length; i += 3) {
		var tri = [idxs[i], idxs[i+1], idxs[i+2]];
		tri.area = triangleArea(vert_list[tri[0]], vert_list[tri[1]], vert_list[tri[2]]);
		tri_list[i/3] = tri;
		total_area += tri.area;
	}
	// Sort triangle list by area.
	tri_list.sort(function(a,b){return a.area - b.area;});
	// Make sample list.  While sample list isnt full:
	var sample_list = [];
	var norm_sample_list = [];
	var cur_tri = 0;
	while (sample_list.length < num_samples * 3) {
		var trisamps = Math.min(Math.ceil(num_samples * tri_list[cur_tri].area / total_area), (num_samples * 3) - sample_list.length);
		var v1 = vert_list[tri_list[cur_tri][0]];
		var v2 = vert_list[tri_list[cur_tri][1]];
		var v3 = vert_list[tri_list[cur_tri][2]];
		var n1 = norm_list[tri_list[cur_tri][0]];
		var n2 = norm_list[tri_list[cur_tri][1]];
		var n3 = norm_list[tri_list[cur_tri][2]];
		// Go down triangle list, adding proportional number of random points to sample list.
		for (var i = 0; i < trisamps; i++) {
			var s = randomTrianglePoint(v1, v2, v3, n1, n2, n3);
			sample_list.push(s[0][0]);
			sample_list.push(s[0][1]);
			sample_list.push(s[0][2]);
			norm_sample_list.push(s[1][0]);
			norm_sample_list.push(s[1][1]);
			norm_sample_list.push(s[1][2]);
		}
		cur_tri++;
	}
	return [sample_list, norm_sample_list];
}

// Gets random samples on a model and binds a buffer with them.
function makeRandomSampleBuffers(verts, norms, idxs, num_samples) {
	var lists = getRandomSamples(verts, norms, idxs, num_samples);
	var sample_list = lists[0];
	var norm_sample_list = lists[1];

	var samplebuffer = gl.createBuffer();
	gl.bindBuffer(
		gl.ARRAY_BUFFER,
		samplebuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array(sample_list),
		gl.STATIC_DRAW);
	samplebuffer.itemSize = 3;
	samplebuffer.numItems = sample_list.length / 3; // Should == num_samples, but just in case...

	var normsamplebuffer = gl.createBuffer();
	gl.bindBuffer(
		gl.ARRAY_BUFFER,
		normsamplebuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array(norm_sample_list),
		gl.STATIC_DRAW);
	normsamplebuffer.itemSize = 3;
	normsamplebuffer.numItems = norm_sample_list.length / 3; // Should == num_samples, but just in case...


	return [samplebuffer, normsamplebuffer];
}
//////////////////////////////////////
// src\npr.js
//////////////////////////////////////
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
//////////////////////////////////////
// src\npr_app_utils.js
//////////////////////////////////////
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


//////////////////////////////////////
// src\Paint.js
//////////////////////////////////////
// Javascript Document.

var NPR = NPR || {};

//
// This file contains functions useful for making a simple 2d painting application using
// the HTML5 canvas element.
//
(function(){
//
// Class Brush
//
NPR.Brush = function(dest_ctx, brush_image) {  
  this.Properties = function() { return new NPR.BrushProperties(this.size, this.color, this.hardness);}
 
  // Initialization.
  // Members:
  // r, hardness, color, dest_ctx, bru
  if(dest_ctx) this.dest_ctx = dest_ctx;
  if(brush_image) this.setBrushImage(brush_image);
}

var Brush = NPR.Brush;

Brush.prototype.Draw = function(x,y,ctx) {
    (ctx ? ctx : this.dest_ctx)
        .drawImage(this.brush_image, x-this.r/2, y-this.r/2);
}

Brush.prototype.DrawLine = function(px, py, x, y, ctx) {
	var c = ctx ? ctx : this.dest_ctx;
	var dx = x - px, dy = y - py;
	var l = Math.sqrt(dx*dx + dy*dy);
	for (var i = 0; i < l / this.r*2; i++) {
		c.drawImage(this.brush_image, x-this.r/2 - (i/l*this.r)*dx/2, y-this.r/2 - (i/l*this.r)*dy/2);
	}
}

Brush.prototype.fromProperties = function(p) {
  	this.makeBrushImage(p.size, p.hardness, p.color);
}

Brush.prototype.setBrushImage = function(brush_image) {
  this.brush_image = brush_image;
  this.r = brush_image.width;
}

// Makes a new brush image.
Brush.prototype.makeBrushImage = function(size, hardness, color, bcanvas) {
  this.r = size; this.hardness = hardness; this.color = color;
  this.setBrushImage(NPR.makeBrushImage(size, hardness, color, bcanvas));
}

Brush.prototype.setColor = function(color) {
  this.makeBrushImage(this.r, this.hardness, color);
}

Brush.prototype.setSize = function(size) {
  this.makeBrushImage(size, this.hardness, this.color);
}

Brush.prototype.setHardness = function(hardness) {
  this.makeBrushImage(this.r, hardness, this.color);
}

//
// Class BrushProperties
// This should contain enough information to construct a brush exactly.
// TODO: If/when custom alphas are supported, this class must be updated to use them.
//
NPR.BrushProperties = function(size, color, hardness) {
	this.size = size || 32;
	this.color = color || [0,0,0,1];
	this.hardness = hardness==undefined ? 0.9 : hardness;
}


//
// Class PaintSession.
// Represents a persistent session of strokes and brush changes that may be replayed,
// undone, or recorded.  It is not necessary to use a PaintSession if its functionality
// is not required.
//
NPR.PaintSession = function(sctx) {
	// Convenience methods to build a stroke over time inside of the PaintSession class.
	this.beginStroke = function(x,y) { this.newstroke = []; this.newstroke[0] = [x,y];}
	this.nextPoint = function(x,y) { this.newstroke.push([x,y]); }
	this.endStroke = function() { 
		if(this.newstroke) this.actions.push(this.newstroke);
		this.newstroke = undefined;
		console.log("Actions:" + this.actions.length); 
	}
	this.addStroke = function(stroke) { this.actions.push(stroke); }
	this.drawStroke = function(stroke) {
	  for (var i = 0; i < stroke.length; i++) {
	  	this.brush.Draw(stroke[i][0], stroke[i][1]);
	  }
	}
	this.undo = function() {
		this.actions.pop();
		ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
		for (var i = 0; i < this.actions.length; i++) {
			if (this.actions[i] instanceof Array) this.drawStroke(this.actions[i]);
		}
	}
	this.setBrush = function(brush) { 
		this.brush = brush;
		new_properties = brush.Properties();
		if (this.brush && this.actions[this.actions.length-1] instanceof NPR.BrushProperties)
		  this.actions[this.actions.length-1] = new_properties;
		else this.actions.push(brush.Properties());
	}
	// Initialization.
	// Members:  brush
	this.actions = [];
	this.sctx = sctx;
}

// Creates (or redraws) a canvas for brush alpha made by drawing a radial gradient.
NPR.makeBrushImage = function(size, hardness, color, bcanvas) {
	var c;
	if (bcanvas) c = bcanvas;
	else c = document.createElement('canvas');
	c.width = size;
	c.height = size;
    var ctx = c.getContext('2d');
    hardness = Math.max(Math.min(hardness, 0.9999), 0);
    var r = size/2;
    var g = ctx.createRadialGradient(r, r, hardness * r,
	                                 r, r, r);
    g.addColorStop(0, 'rgba('+color[0]+','+color[1]+','+color[2]+','+color[3]+')');
    g.addColorStop(1, 'rgba('+color[0]+','+color[1]+','+color[2]+',0)');
    ctx.fillStyle = g;
    ctx.clearRect(0, 0, size, size);
    ctx.fillRect(0,0,size,size);
    ctx.fill();
    return c;
}

})();
//////////////////////////////////////
// src\Polygon.js
//////////////////////////////////////
var NPR = NPR || {}

//
//  This file contains utilities for interactively creating 2d Polygons.
//  These are polygons that could be used, for instance, as graftals.
//  Utilities for uploading the 2d polygons to the GPU are also provided.
//

//
// Polygon: A base class for 2d polygons.
//

NPR.Polygon = function(canvas) {
	// Members.
	this.points = [];
	// TODO: Having the polygon keep track of a canvas context was a stupid idea.
	this.ctx = canvas ? canvas.getContext('2d') : null;
}

// A bunch of constants that serve the purpose of an enum.
NPR.Polygon.prototype.TRIANGLES = 0;
NPR.Polygon.prototype.TRIANGLE_STRIP = 1;
NPR.Polygon.prototype.TRIANGLE_FAN = 2;
NPR.Polygon.prototype.polyType = -1;  // Invalid, should be overridden to one of the above constants.

NPR.Polygon.prototype.addPoint = function(x,y) {
	this.points.push([x,y]);
}

NPR.Polygon.prototype.makeOutlinePolygon = function(thickness) {
	throw "Abstract Method NPR.Polygon::makeOutlinePolygon() called.";
}

NPR.Polygon.prototype.draw = function(ctx2d) {
	throw "Abstract Method NPR.Polygon::draw() called.";
}

NPR.Polygon.prototype.drawTriangle = function(p1, p2, p3, ctx2d) {
	if (!this.ctx && !ctx2d) throw "NPR.Polygon::drawTriangle called with no canvas context.";
	var ctx = ctx2d ? ctx2d : this.ctx;
	ctx.fillStyle=("#fff");
	ctx.beginPath();
	ctx.moveTo(p1[0], p1[1]);
	ctx.lineTo(p2[0], p2[1]);
	ctx.lineTo(p3[0], p3[1]);
	ctx.lineTo(p1[0], p1[1]);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
}

NPR.Polygon.prototype.getNormalized = function() {
	var values = [];
	var pts = this.points;
	var minx = pts[0][0], miny = pts[0][1], maxx = pts[0][0], maxy = pts[0][1];
	for (var i = 0; i < pts.length; i++) {
		minx = pts[i][0] < minx ? pts[i][0] : minx;
		miny = pts[i][1] < miny ? pts[i][1] : miny;
		maxx = pts[i][0] > maxx ? pts[i][0] : maxx;
		maxy = pts[i][1] > maxy ? pts[i][1] : maxy;
	}
	var range_x = Math.abs(maxx-minx);
	var range_y = Math.abs(maxy-miny);
	var rx = Math.min(1.0, range_x/range_y);
	var ry = Math.min(1.0, range_y/range_x);
	for (var i = 0; i < pts.length; i++) {
		var px = ((pts[i][0] - minx) / (maxx-minx)) * rx;
		var py = (1.0 - (pts[i][1] - miny) / (maxy-miny)) * ry;
		values.push([px, py]);
	}
	return values;
}

// Utility function to flatten an array of 2d vectors.
NPR.Polygon.prototype.flatten = function(pts) {
  var values = [];
  for (var i = 0; i < pts.length; i++) {
		values.push(pts[i][0]);
		values.push(pts[i][1]);
  }
  return values;
}

NPR.Polygon.prototype.getNormalizedFlattened = function() {
	return this.flatten(this.getNormalized());
}

NPR.Polygon.prototype.getNormalizedFlattenedTriangles = function() {
	return this.getFlattenedTriangles(this.getNormalized());
}

NPR.Polygon.prototype.getFlattenedTriangles = function () {
	throw "Abstract Method NPR.Polygon::getFlattenedTriangles() called.";
}

// Given a WebGL context, make a vertex buffer containing only 2d vertex positions.
NPR.Polygon.prototype.makeVertexBuffer = function(gl) {
	var vertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.getNormalizedFlattened()), gl.STATIC_DRAW);
    vertexPositionBuffer.itemSize = 2;
    vertexPositionBuffer.numItems = this.points.length;
	return vertexPositionBuffer;
}

// Given a WebGL context, make a vertex buffer containing multiple copies of the polygon.
// Also return a vertex attribute buffer with an instanceID per vertex.
NPR.Polygon.prototype.makeInstancedVertexBuffer = function(gl, num_instances, single_vert_data) {
	var single_vertex_data = single_vert_data ? single_vert_data : this.getNormalizedFlattenedTriangles();
	var vertex_data = [];
	var instance_ids = [];
	var size = single_vertex_data.length;
	for (var i = 0; i < num_instances; i++) {
		for (var v = 0; v < size; v++) {
			vertex_data[v + size*i] = single_vertex_data[v];
			
		}
		for (var v = 0; v < size/2; v++) {
			instance_ids[v + size/2*i] = i;
		}
	}
	var vertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertex_data), gl.STATIC_DRAW);
    vertexPositionBuffer.itemSize = 2;
    vertexPositionBuffer.numItems = vertex_data.length/2;

    var instanceIDBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceIDBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instance_ids), gl.STATIC_DRAW);
    instanceIDBuffer.itemSize = 1;
    instanceIDBuffer.numItems = vertex_data.length/2;

    return {"VertexPositionBuffer" : vertexPositionBuffer,
			"InstanceIDBuffer"     : instanceIDBuffer};
}

// Given a WebGL context, make a vertex buffer containing multiple copies of the outline of the polygon.
// Also return an InstanceID buffer.
NPR.Polygon.prototype.makeInstancedOutlineBuffer = function(gl, num_instances) {
  // For the default case, let's just return the same buffer as the instanced vertex buffer.
  // For Triangle Fans and Triangle strips though, we'll want to do something different to get only the outlines we want.
  return this.makeInstancedVertexBuffer(gl, num_instances);
}

//
// Class TriStrip: A set of polygons that are specified as a Triangle Strip.
//

NPR.TriStrip = function(canvas) {
	NPR.Polygon.call(this, canvas);

	// Overridden from Parent.
	// Draws set of points as a triangle strip.
	this.draw = function(ctx2d) {
		var pts = this.points;
		if (pts.length < 3) throw "NPR.TriStrip.draw() called with fewer than 3 points.";
		for (var  i = 2; i < pts.length; i++) {
		  var p1 = pts[i-2]; var p2 = pts[i-1]; var p3 = pts[i];
		  this.drawTriangle(p1, p2, p3, ctx2d);
		}
	}
}

NPR.TriStrip.prototype = Object.create(NPR.Polygon.prototype);

NPR.TriStrip.prototype.polyType = NPR.Polygon.prototype.TRIANGLE_STRIP;

NPR.TriStrip.prototype.getFlattenedTriangles = function(data) {
	var pts = data ? data : this.points;
	pts = this.flatten(pts);
	var triangles = [];
	for (var i = 4; i < pts.length; i+=2) {
		if ((i/3)&1) {  // odd
		    triangles.push(pts[i-2]); triangles.push(pts[i-1]);
			triangles.push(pts[i-4]); triangles.push(pts[i-3]); 
		    triangles.push(pts[i]);   triangles.push(pts[i+1]);
		} else {  // even
			triangles.push(pts[i-4]); triangles.push(pts[i-3]); 
		    triangles.push(pts[i-2]); triangles.push(pts[i-1]);
		    triangles.push(pts[i]);   triangles.push(pts[i+1]);
		}
	}
	return triangles;
}

// TODO: Writing this made me realize that I can no longer really get along without a Vec2 class.
NPR.TriStrip.prototype.makeOutlinePolygon = function(thickness, normalized) {
	function ccw(a,b,c) { 
		return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
	}

	// The outline itself is a triangle strip.
	var ol = new NPR.TriStrip();

	// Get a list of the points in the order that we will traverse them (odds, backwards evens).
	var pts = normalized ? this.getNormalized() : this.points;
	// getNormalized flips them, so set them straight for consistency...
	var evens = [];
	var odds = [];
	for (var i = 0; i<pts.length; i++) {
  	  if ((i+1)%2==0) evens.push(pts[i]);
  	  else odds.push(pts[i]);
    }
    var vals = odds.concat(evens.reverse());
    for (var i = 0; i < vals.length; i++) {
    	var wvec;  // The offset vector.
		var p = vals[i];
    	if (i==0) { wvec = [0,0];
    	} else if (i==vals.length-1) { wvec = [0,0];
    	} else {
    	  // Get the offset direction from the adjacent points.
    	  var p0 = vals[i-1];
    	  var p1 = vals[i+1];
    	  var v0p = [p[0]-p0[0], p[1]-p0[1]];
    	  var mag_v0p = Math.sqrt(v0p[0]*v0p[0] + v0p[1]*v0p[1]);
    	  v0p[0] = v0p[0]/mag_v0p;  v0p[1] = v0p[1]/mag_v0p;
    	  var v1p = [p[0]-p1[0], p[1]-p1[1]];    	  
    	  var mag_v1p = Math.sqrt(v1p[0]*v1p[0] + v1p[1]*v1p[1]);
    	  v1p[0] = v1p[0]/mag_v1p;  v1p[1] = v1p[1]/mag_v1p;
    	  // If parallel, then just rotate vp0 90 degrees CCW.
    	  var ccw_test = ccw(p0, p, p1);
    	  if (Math.abs(ccw_test-1.0) < 0.00001) {
    	  	wvec = [-vp0[1], vp0[0]];
    	  } else {
    	  	// Otherwise, get offset by normalizing v0p+v1p.
    	  	wvec = [v0p[0]+v1p[0], v0p[1]+v1p[1]];
    	  	var magwvec = Math.sqrt(wvec[0]*wvec[0] + wvec[1]*wvec[1]);
    	  	wvec[0] = wvec[0]/magwvec;
    	  	wvec[1] = wvec[1]/magwvec;
    	  }
    	}
    	var flip = (ccw_test>0 || i==0 || i==vals.length-1)? -1 : 1;
    	flip *= normalized ? 1 : -1;
    	wvec[0] = wvec[0]*thickness*flip;
    	wvec[1] = wvec[1]*thickness*flip;
    	// Now append our two new points.
    	ol.addPoint(p[0]+wvec[0], p[1]+wvec[1]);
    	ol.addPoint(p[0], p[1]);
    }
	return ol;
}

//
// Class TriFan: A set of polygons that are specified as a Triangle Fan.
//

NPR.TriFan = function(canvas) {
	NPR.Polygon.call(this, canvas);

	// Overridden from Parent.
	// Draws set of points as a triangle fan.
	this.draw = function(ctx2d) {
		var pts = this.points;
		if (pts.length < 3) throw "NPR.TriFan.draw() called with fewer than 3 points.";
		for (var  i = 2; i < pts.length; i++) {
		  var p1 = pts[0]; var p2 = pts[i-1]; var p3 = pts[i];
		  this.drawTriangle(p1, p2, p3, ctx2d);
		}
	}
}

NPR.TriFan.prototype = Object.create(NPR.Polygon.prototype);

NPR.TriFan.prototype.polyType = NPR.Polygon.prototype.TRIANGLE_FAN;

NPR.TriFan.prototype.getFlattenedTriangles = function(data) {
	var pts = data ? data : this.points;
	pts = this.flatten(pts);
	var triangles = [];
	for (var i = 4; i < pts.length; i+=2) {
		triangles.push(pts[0]); triangles.push(pts[1]);
		triangles.push(pts[i-2]); triangles.push(pts[i-1]);
		triangles.push(pts[i]); triangles.push(pts[i+1]);
	}
	return triangles;
}

NPR.TriFan.prototype.makeOutlinePolygon = function(thickness, normalized) {
  	function ccw(a,b,c) { 
		return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
	}

	// The outline itself is a triangle strip.
	var ol = new NPR.TriStrip();
	// Get a list of the points in the order that we will traverse them (odds, backwards evens).
	var vals = normalized ? this.getNormalized() : this.points;
    vals.splice(0,1);
    for (var i = 0; i < vals.length; i++) {
    	var wvec;  // The offset vector.
		var p = vals[i];
    	if (i==0) { wvec = [0,0]; } 
    	else if (i==vals.length-1) { wvec = [0,0]; } 
    	else {
    	  // Get the offset direction from the adjacent points.
    	  var p0 = vals[i-1];  // pt before
    	  var p1 = vals[i+1];  // pt after
    	  var v0p = [p[0]-p0[0], p[1]-p0[1]];  // p - p0
    	  var mag_v0p = Math.sqrt(v0p[0]*v0p[0] + v0p[1]*v0p[1]);
    	  v0p[0] = v0p[0]/mag_v0p;  v0p[1] = v0p[1]/mag_v0p;
    	  var v1p = [p[0]-p1[0], p[1]-p1[1]];    	  
    	  var mag_v1p = Math.sqrt(v1p[0]*v1p[0] + v1p[1]*v1p[1]);
    	  v1p[0] = v1p[0]/mag_v1p;  v1p[1] = v1p[1]/mag_v1p;
    	  // If parallel, then just rotate vp0 90 degrees CCW.
    	  var ccw_test = ccw(p0, p, p1);
    	  if (Math.abs(ccw_test-1.0) < 0.00001) {
    	  	wvec = [-vp0[1], vp0[0]];
    	  } else {
    	  	// Otherwise, get offset by normalizing v0p+v1p.
    	  	wvec = [v0p[0]+v1p[0], v0p[1]+v1p[1]];
    	  	var magwvec = Math.sqrt(wvec[0]*wvec[0] + wvec[1]*wvec[1]);
    	  	wvec[0] = wvec[0]/magwvec;
    	  	wvec[1] = wvec[1]/magwvec;
    	  }
    	}
    	var flip = (ccw_test>0 || i==0 || i==vals.length-1)? -1 : 1;
    	flip *= normalized ? -1 : 1;
    	wvec[0] = wvec[0]*thickness*flip;
    	wvec[1] = wvec[1]*thickness*flip;
    	// Now append our two new points.
    	ol.addPoint(p[0]+wvec[0], p[1]+wvec[1]);
    	ol.addPoint(p[0], p[1]);
    }
	return ol;
}

//
// Class Triangles: A set of polygons that are specified as individual triangles.
//

NPR.Triangles = function(canvas) {
	NPR.Polygon.call(this, canvas);

	// Overridden from Parent.
	// Draws set of points as a triangle fan.
	this.draw = function(ctx2d) {
		var pts = this.points;
		if (pts.length < 3) throw "NPR.Triangles.draw() called with fewer than 3 points.";
		for (var  i = 2; i < pts.length; i+=3) {
		  var p1 = pts[i-2]; var p2 = pts[i-1]; var p3 = pts[i];
		  this.drawTriangle(p1, p2, p3, ctx2d);
		}
		if (i!=pts.length) throw "NPR.Triangles.draw() called with an incomplete number of points."
	}
}

NPR.Triangles.prototype = Object.create(NPR.Polygon.prototype);

NPR.Triangles.prototype.makeOutlinePolygon = function(thickness, normalized) {
  throw "TODO NPR.Triangles.prototype.makeOutlinePolygon";
}

NPR.Triangles.prototype.getFlattenedTriangles = function(data) {
	var pts = data ? data : this.points;
	return this.flatten(pts);
}

NPR.Triangles.prototype.polyType = NPR.Polygon.prototype.TRIANGLES;
//////////////////////////////////////
// src\RenderPass.js
//////////////////////////////////////
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
//////////////////////////////////////
// src\Shader.js
//////////////////////////////////////
var NPR = NPR || {};

// Shader wrapper that is a stripped down version of the Shader object
// from Evan Wallace's lightgl.js library: https://github.com/evanw/lightgl.js.
// The clever pieces of type-checking on uniform values and particularly the 
// 
NPR.Shader = function(vertex_src, fragment_src) {
	
  var gl = NPR.gl;

  function compileSource(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw 'compile error: ' + gl.getShaderInfoLog(shader);
    }
    return shader;
  }
  
  // Compile and link the shader programs.
  this.program = gl.createProgram();
  gl.attachShader(this.program, compileSource(gl.VERTEX_SHADER, vertex_src));
  gl.attachShader(this.program, compileSource(gl.FRAGMENT_SHADER, fragment_src));
  gl.linkProgram(this.program);
  if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
    throw 'link error: ' + gl.getProgramInfoLog(this.program);
  }
  
  // This is the list of per-model attributes required for drawing.
  // When a model is drawn, the attributes in this list are requested from the model.
  // If any is missing, an exception is thrown.
  // Note that this is a mapping of Buffer Name (versus attribute name) to attribute pointer.
  this.attributes = {};

  //
  // Clever features taken from lightgl.
  //

  // Sampler uniforms need to be uploaded using `gl.uniform1i()` instead of `gl.uniform1f()`.
  // To do this automatically, we detect and remember all uniform samplers in the source code.
  function regexMap(regex, text, callback) {
    while ((result = regex.exec(text)) != null) {
      callback(result);
    }
  }
  var isSampler = {};
  regexMap(/uniform\s+sampler(1D|2D|3D|Cube)\s+(\w+)\s*;/g, vertex_src + fragment_src, function(groups) {
    isSampler[groups[2]] = 1;
  });
  this.isSampler = isSampler;
  // End auto detection of samplers.

  // These functions are for inferring uniform types from the value's type.
  function isArray(obj) {
    var str = Object.prototype.toString.call(obj);
    return str == '[object Array]' || str == '[object Float32Array]';
  }
  function isNumber(obj) {
    var str = Object.prototype.toString.call(obj);
    return str == '[object Number]' || str == '[object Boolean]';
  }

  // Given a map of uniform names and values, set all uniforms that can be found in the shader.
  // Infer the correct type of uniform from the value type, length (if array),
  // and internal record of sampler names.
  this.setUniforms = function(uniform_vals) {
  	gl.useProgram(this.program);
  	for (var name in uniform_vals) {
  	  var location = gl.getUniformLocation(this.program, name);
      if (!location) continue;
      var value = uniform_vals[name];
        if (isArray(value)) {
        switch (value.length) {
          case 1: gl.uniform1fv(location, new Float32Array(value)); break;
          case 2: gl.uniform2fv(location, new Float32Array(value)); break;
          case 3: gl.uniform3fv(location, new Float32Array(value)); break;
          case 4: gl.uniform4fv(location, new Float32Array(value)); break;
          case 9: gl.uniformMatrix3fv(location, false, new Float32Array(value)); break;
          case 16: gl.uniformMatrix4fv(location, false, new Float32Array(value)); break;
          default: throw 'don\'t know how to load uniform "' + name + '" of length ' + value.length;
        }
      } else if (isNumber(value)) {
        (this.isSampler[name] ? gl.uniform1i : gl.uniform1f).call(gl, location, value);
      } else {
        throw 'attempted to set uniform "' + name + '" to invalid value ' + value;
      }
  	}
  }

  //
  // End clever features taken from lightgl.
  //

  // The matrix uniforms are handled separately for convenience.
  // They may instead be set with setUniforms() if desired.
  gl.useProgram(this.program);
  this.pMatrixUniform = gl.getUniformLocation(this.program, "uPMatrix");
  this.mvMatrixUniform = gl.getUniformLocation(this.program, "uMVMatrix");
  this.nMatrixUniform = gl.getUniformLocation(this.program, "uNMatrix");
  
  this.setMatrixUniforms = function(mvMatrix, pMatrix, nMatrix) {
  gl.useProgram(this.program);
  if (this.mvMatrixUniform && mvMatrix)
    gl.uniformMatrix4fv(this.mvMatrixUniform, false, mvMatrix);
  if (this.pMatrixUniform && pMatrix)
    gl.uniformMatrix4fv(this.pMatrixUniform, false, pMatrix);
  if (this.nMatrixUniform && nMatrix)
    gl.uniformMatrix3fv(this.nMatrixUniform, false, nMatrix);
  }

  // Draw a model with the shader, assuming the uniforms have been set.
  // If point_samples evaluates to true, then draw using the RandomSampleBuffer as gl.POINTS.
  this.drawModel = function(model, type, buffer_name, buffer_is_elements) {
  	gl.useProgram(this.program);
  	// Bind all the required attributes.
  	for (buffer in this.attributes) {
  		if (!model[buffer]) throw 'drawing error: missing buffer: ' + buffer; 
  		gl.bindBuffer(gl.ARRAY_BUFFER, model[buffer]);
  		gl.vertexAttribPointer(this.attributes[buffer], model[buffer].itemSize, gl.FLOAT, false, 0, 0);
  		gl.enableVertexAttribArray(this.attributes[buffer]);
  	}

    // Whether we are drawing as element arrays or not.
    var draw_arrays = ((!buffer_name) && model["VertexIndexBuffer"]) || buffer_is_elements;

    // If buffer_name is supplied, it is understood that it will replace the VertexPositionBuffer.
    if (buffer_name && model[buffer_name] && !draw_arrays) {
      gl.bindBuffer( draw_arrays ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER, model[buffer_name]);
      gl.vertexAttribPointer(this.attributes["VertexPositionBuffer"], model[buffer_name].itemSize, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.attributes["VertexPositionBuffer"]);
    }


    var draw_type = type !== undefined ? type : gl.TRIANGLES;
    var buffer_used = (buffer_name && model[buffer_name]) ? buffer_name 
                                                          : (model["VertexIndexBuffer"] ? "VertexIndexBuffer" 
                                                                                        : "VertexPositionBuffer");
    if (draw_arrays) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model[buffer_used]);
      gl.drawElements(draw_type, model[buffer_used].numItems, gl.UNSIGNED_SHORT, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, model[buffer_used]);
      gl.drawArrays(draw_type, 0, model[buffer_used].numItems );
      gl.bindBuffer(gl.ARRAY_BUFFER, null); 
    }	
  }

  this.bind = function() {
    gl.useProgram(this.program);
  }
  this.release = function() {
    gl.useProgram(null);
  }
}
//////////////////////////////////////
// src\Passes\DepthPass.js
//////////////////////////////////////
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
//////////////////////////////////////
// src\Passes\PainterlyBillboardPass.js
//////////////////////////////////////
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
//////////////////////////////////////
// src\Shaders\ColorLightDirShader.js
//////////////////////////////////////
//
// A directional light shader for a single  color.
//
// Uniforms:
//   vec3 uColor - the flat color to render.
//   vec uLightDir - 
//
// Attributes:
//	 "VertexPositionBuffer" => aVertexPosition : The 3d position of a point.
//   "VertexNormalBuffer"   => aVertexNormal   : Normal.

var NPR = NPR || {};

NPR.ColorLightDirShader = function() {

  var gl = NPR.gl;

  var vertex_src = "\
  attribute vec3 aVertexPosition;\
  attribute vec3 aVertexNormal;\
  uniform mat4 uMVMatrix;\
  uniform mat4 uPMatrix;\
  uniform mat3 uNMatrix;\
  uniform vec3 uLightDir;\
  varying float vLightIntensity;\
  void main(void) {\
    vLightIntensity = dot(uLightDir, uNMatrix * aVertexNormal);\
  	gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
  }\
  "

  var fragment_src = "\
  #ifdef GL_ES\n\
  	precision highp float;\n\
  #endif\n\
  uniform vec3 uColor;\
  varying float vLightIntensity;\
  \
  void main(void) {\
      gl_FragColor.rgb = mix(vec3(0,0,0), uColor, vLightIntensity);\
      gl_FragColor.a = 1.0;\
  }\
  "

  NPR.Shader.call(this, vertex_src, fragment_src);
  this.attributes = {
    "VertexPositionBuffer" : gl.getAttribLocation(this.program, "aVertexPosition"),
    "VertexNormalBuffer"   : gl.getAttribLocation(this.program, "aVertexNormal")
  }
}

NPR.ColorLightDirShader.prototype = Object.create(NPR.Shader.prototype);
//////////////////////////////////////
// src\Shaders\ColorShader.js
//////////////////////////////////////
//
// A flat color shader for general 3d meshes.
//
// Uniforms:
//   vec4 uColor - the flat color to render.
//
// Attributes:
//	 "VertexPositionBuffer" => aVertexPosition : The 3d position of a point.
//

var NPR = NPR || {};

NPR.ColorShader = function() {

  var gl = NPR.gl;

  var vertex_src = "\
  attribute vec3 aVertexPosition;\
  uniform mat4 uMVMatrix;\
  uniform mat4 uPMatrix;\
  uniform mat3 uNMatrix;\
  void main(void) {\
  	gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
  }\
  "

  var fragment_src = "\
  #ifdef GL_ES\n\
  	precision highp float;\n\
  #endif\n\
  uniform vec4 uColor;\
  \
  void main(void) {\
      gl_FragColor = uColor;\
  }\
  "

  NPR.Shader.call(this, vertex_src, fragment_src);
  this.attributes = {
    "VertexPositionBuffer" : gl.getAttribLocation(this.program, "aVertexPosition")
  }
}

NPR.ColorShader.prototype = Object.create(NPR.Shader.prototype);
//////////////////////////////////////
// src\Shaders\DepthShader.js
//////////////////////////////////////
//
// A Depth shader for general 3d meshes.
//
// Uniforms:
//   uNear - the near clipping plane.
//   uFar  - the far clipping plane.
//
// Attributes:
//	 "VertexPositionBuffer" => aVertexPosition : The 3d position of a point.
//

var NPR = NPR || {};

NPR.DepthShader = function() {

  var gl = NPR.gl;

  var vertex_src = "\
  attribute vec3 aVertexPosition;\
  uniform mat4 uMVMatrix;\
  uniform mat4 uPMatrix;\
  uniform mat3 uNMatrix;\
  void main(void) {\
  	gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
  }\
  "

  var fragment_src = "\
  #ifdef GL_ES\n\
  	precision highp float;\n\
  #endif\n\
  uniform float uNear;\
  uniform float uFar;\
  \
  float linearizeDepth(float d) { \
      float n = uNear + 0.00001;\
      return (2.0 * n) / (uFar + n - d * (uFar - n));\
  }\
  \
  void main(void) {\
  	  float depth = linearizeDepth(gl_FragCoord.z);\
      gl_FragColor.r = depth;\
      gl_FragColor.g = gl_FragColor.r;\
      gl_FragColor.b = gl_FragColor.r;\
      gl_FragColor.a = 1.0;\
  }\
  "

  NPR.Shader.call(this, vertex_src, fragment_src);
  this.attributes = {
    "VertexPositionBuffer" : gl.getAttribLocation(this.program, "aVertexPosition")
  }
}

NPR.DepthShader.prototype = Object.create(NPR.Shader.prototype);
//////////////////////////////////////
// src\Shaders\FacingRatioOutlineShader.js
//////////////////////////////////////
//
// A facing-ratio based outline shader.
//
// Uniforms:
//   vec3 uColor - the flat color to render.
//   vec3 uOutlineColor - the outline color.
//
// Attributes:
//	 "VertexPositionBuffer" => aVertexPosition : The 3d position of a point.
//

var NPR = NPR || {};

NPR.FacingRatioOutlineShader = function() {

  var gl = NPR.gl;

  var vertex_src = "\
  attribute vec3 aVertexPosition;\
  attribute vec3 aVertexNormal;\
  uniform mat4 uMVMatrix;\
  uniform mat4 uPMatrix;\
  uniform mat3 uNMatrix;\
  varying float vFacingRatio;\
  void main(void) {\
    /* Facing Ratio */\
    vec3 mvn = uNMatrix * aVertexNormal;\
    vFacingRatio = dot(normalize(mvn), vec3(0,0,1));\
  	gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
  }\
  "

  var fragment_src = "\
  #ifdef GL_ES\n\
  	precision highp float;\n\
  #endif\n\
  uniform vec3 uColor;\
  uniform vec3 uOutlineColor;\
  varying float vFacingRatio;\
  \
  void main(void) {\
      float val = smoothstep(0.0, 0.4, vFacingRatio-0.2);\
      gl_FragColor.rgb = mix(uOutlineColor, uColor, val);\
      gl_FragColor.a = 1.0;\
  }\
  "

  NPR.Shader.call(this, vertex_src, fragment_src);
  this.attributes = {
    "VertexPositionBuffer" : gl.getAttribLocation(this.program, "aVertexPosition"),
    "VertexNormalBuffer" : gl.getAttribLocation(this.program, "aVertexNormal")
  }
}

NPR.FacingRatioOutlineShader.prototype = Object.create(NPR.Shader.prototype);
//////////////////////////////////////
// src\Shaders\GraftalShader.js
//////////////////////////////////////
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
//////////////////////////////////////
// src\Shaders\HatchBillboardShader.js
//////////////////////////////////////
//
// A shader for Hatching from Tonal Art Maps, implemented as instanced quad splats.
//
// Uniforms:
//   sampler2D uLappedMask - the alpha for each quad.
//   sampler2D uTamTex1 : the lighter three TAM levels.
//   sampler2D uTamTex2: the darker three TAM levels
//   sampler2D uInstanceAttrTex - the texture sampler for per-instance variables (position).
//   float uAttrTexDim  - the square dimension of the attribute texture.
//   vec2 uScale - the uniform scale (2d geometry positions are normalized)
//
// Attributes:
//   vec2 "VertexPositionBuffer" => aVertexPosition : The 2d position of the point in graftal space.
//   float "InstanceIDBuffer"    => aInstanceID : The instance id that the position belongs to.


var NPR = NPR || {};

NPR.HatchBillboardShader = function() {

  var gl = NPR.gl;

  var vertex_src = "\
    uniform float uYaw;\
    uniform float uPitch;\
    \
    uniform mat4 uMVMatrix;\
    uniform mat4 uPMatrix;\
    uniform mat3 uNMatrix;\
    uniform float uAttrTexDim;\
    uniform vec2 uScale;\
    uniform vec3 uLightDir;\
    \
    uniform sampler2D uLappedMask;\
    uniform sampler2D uTamTex1;\
    uniform sampler2D uTamTex2;\
    uniform sampler2D uInstanceAttrTex;\
    \
    attribute vec2 aVertexPosition;\
    attribute float aInstanceID;\
    \
    varying vec2 vTexCoord;\
    varying float vFacingRatio;\
    varying float vLightIntensity;\
    \
    vec2 attrTexCell(float idx) {\
        float r = floor(idx / uAttrTexDim);\
        float c = mod(idx, uAttrTexDim);\
        float drc = 0.5 / uAttrTexDim;\
        vec2 attrTc = vec2(c/uAttrTexDim+drc, r/uAttrTexDim+drc);\
        return attrTc;\
    }\
    \
    void main(void) {\
      float pi = 3.14159265358;\
      vec2 attrTc = attrTexCell(2.0 * aInstanceID);\
      vec4 instpos = texture2D(uInstanceAttrTex, attrTc);\
      vec3 instnorm = texture2D(uInstanceAttrTex, attrTexCell(2.0 * aInstanceID + 1.0)).xyz;\
      vec4 mvpos = uMVMatrix * instpos;\
      vec4 mvppos = uPMatrix * mvpos;\
      vec2 screen_coord = mvppos.xy / 2.0 / mvppos.w + vec2(0.5, 0.5);\
      vTexCoord = aVertexPosition;\
      \
      /* Project normal to the screen. */\
      vec4 p1 = mvppos;\
      vec4 p2 = instpos + vec4(instnorm.xyz, 1.0);\
      p2 = uPMatrix * uMVMatrix * p2;\
      vec3 projnorm = (p2 - p1).xyz;\
      float dz = -projnorm.z; projnorm.z=projnorm.y; projnorm.y=dz;\
      projnorm = normalize(projnorm);\
      projnorm.z = 0.0;\
      projnorm = normalize(projnorm);\
      \
      /* Facing Ratio */\
      vec3 mvn = normalize(uNMatrix * instnorm);\
      vFacingRatio = dot(mvn, vec3(0,0,1));\
      vLightIntensity = dot(mvn, normalize(uLightDir));\
      \
        /* Build a rotation matrix so we don't billboard. */\
      vec3 ra = -cross(vec3(0,0,1.0), mvn);\
      float cA = dot(vec3(0,0,1.0), mvn);\
      float icA = 1.0 - cA;\
      float sA = sin(acos(cA));\
      mat3 rotMat;\
      float r00 = cA+ra.x*ra.x*icA;  float r01 = ra.x*ra.y*icA-ra.z*sA; float r02 = ra.x*ra.z*icA+ra.y*sA;\
      float r10 = ra.y*ra.x*icA+ra.z*sA;  float r11 = cA+ra.y*ra.y*icA;  float r12 = ra.y*ra.z*icA-ra.x*sA;\
      float r20 = ra.z*ra.x*icA-ra.y*sA;  float r21 = ra.z*ra.y*icA+ra.x*sA;  float r22 = cA+ra.z*ra.z*icA;\
        rotMat[0] = vec3(r00, r01, r02);\
      rotMat[1] = vec3(r10, r11, r12);\
      rotMat[2] = vec3(r20, r21, r22);\
      vec3 rmp = rotMat * vec3((aVertexPosition-vec2(.5,.5))*uScale, 0);\
      vec4 ppp = mvpos + vec4(rmp, 0);\
      \
      /* Rotation around screen normal. */\
      vec2 tpos = aVertexPosition - vec2(0.5, 0.5);\
      tpos = tpos * uScale;\
      float angle = atan(projnorm.y, projnorm.x) - pi/2.0;\
      float ox  = tpos.x;\
      tpos.x = tpos.x * cos(angle) - tpos.y * sin(angle);\
        tpos.y = ox * sin(angle) + tpos.y * cos(angle);\
      \
      gl_Position = mvppos;\
      gl_Position.xy = gl_Position.xy + tpos;\
      gl_Position = uPMatrix * ppp;\
    }\
  "

  var fragment_src = "\
  precision mediump float;\
  \
    uniform sampler2D uLappedMask;\
  uniform sampler2D uTamTex1;\
  uniform sampler2D uTamTex2;\
  \
  varying float vFacingRatio;\
  varying vec2 vTexCoord;\
  varying float vLightIntensity;\
  \
  void main(void) {\
    if (vFacingRatio < -0.0) discard;\
    float fade = (vFacingRatio-0.25)/0.75;\
    vec4 mask = texture2D(uLappedMask, vTexCoord);\
    float hatchval = 0.0;\
    vec4 hatchSamp1 = texture2D(uTamTex1, vTexCoord);\
    vec4 hatchSamp2 = texture2D(uTamTex2, vTexCoord);\
    if (vLightIntensity > 0.9) {\
      hatchval = mix(1.0, hatchSamp1.x, 1.0-(vLightIntensity - 0.9)/0.1);\
    } else if (vLightIntensity > 0.8) {\
      float v1 = hatchSamp1.x;\
      float v2 = hatchSamp1.y;\
      hatchval = mix(v1, v2, 1.0-(vLightIntensity - 0.8)/0.2);\
    } else if (vLightIntensity > 0.65) {\
      float v1 = hatchSamp1.y;\
      float v2 = hatchSamp1.z;\
      hatchval = mix(v1, v2, 1.0-(vLightIntensity - 0.65)/0.15);\
    } else if (vLightIntensity > 0.5) {\
      float v1 = hatchSamp1.z;\
      float v2 = hatchSamp2.x;\
      hatchval = mix(v1, v2, 1.0-(vLightIntensity - 0.5)/0.15);\
    } else if (vLightIntensity > 0.35) {\
      float v1 = hatchSamp2.x;\
      float v2 = hatchSamp2.y;\
      hatchval = mix(v1, v2, 1.0-(vLightIntensity - 0.35)/0.15);\
    } else if (vLightIntensity > 0.2) {\
      float v1 = hatchSamp2.y;\
      float v2 = hatchSamp2.z;\
      hatchval = mix(v1, v2, 1.0-(vLightIntensity - 0.2)/0.15);\
    } else {\
      hatchval = texture2D(uTamTex2, vTexCoord).z;\
    }\
    gl_FragColor.a = mask.r;\
    if (mask.r < 0.01) discard;\
    gl_FragColor.a = gl_FragColor.a * fade;\
      gl_FragColor.rgb = vec3(hatchval, hatchval, hatchval) * gl_FragColor.a;\
  }\
  "

  NPR.Shader.call(this, vertex_src, fragment_src);
  this.attributes = {"VertexPositionBuffer" : gl.getAttribLocation(this.program, "aVertexPosition"),
                     "InstanceIDBuffer"     : gl.getAttribLocation(this.program, "aInstanceID")};

}

NPR.HatchBillboardShader.prototype = Object.create(NPR.Shader.prototype);
//////////////////////////////////////
// src\Shaders\OpticalFlowShader.js
//////////////////////////////////////
var NPR = NPR || {};

// Optical flow shader using roughly the Lucas Kanade approach as
// described in http://en.wikipedia.org/wiki/Lucas%E2%80%93Kanade_method
// This is a pretty straightfoward dumb implementation and you can probably
// do something cooler/more accurate/more efficient.

NPR.OpticalFlowShader = function() {
  var gl = NPR.gl;

  var vertex_src = "\
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
  }\
  ";

  var fragment_src = "\
  #ifdef GL_ES\n\
    precision highp float;\n\
  #endif\n\
  uniform sampler2D uTexture0;\
  uniform sampler2D uTexture1;\
  uniform sampler2D uTexture2;\
  uniform vec2 uTexDim;\
  \
  varying vec2 vTexCoord;\
  \
  float valueFromRgb(vec4 color) {\
    return dot(vec3(0.3, 0.59, 0.11), color.rgb);\
  }\
  \
  float xGradient(vec2 coord) {\
    vec2 dx = vec2(5.0 / uTexDim.x, 0.0);\
    return valueFromRgb(texture2D(uTexture1, coord + dx))\
         - valueFromRgb(texture2D(uTexture1, coord - dx));\
  }\
  \
  float yGradient(vec2 coord) {\
    vec2 dy = vec2(0.0, 5.0 / uTexDim.y);\
    return valueFromRgb(texture2D(uTexture1, coord + dy))\
         - valueFromRgb(texture2D(uTexture1, coord - dy));\
  }\
  \
  float tGradient(vec2 coord) {\
    return valueFromRgb(texture2D(uTexture2, coord))\
         - valueFromRgb(texture2D(uTexture0, coord));\
  }\
  \
  void main(void) {\
    float sIxIx = 0.0;\
    float sIyIy = 0.0;\
    float sIxIy = 0.0;\
    float sIxIt = 0.0;\
    float sIyIt = 0.0;\
    float sample_reach = 3.0;\
    const float sample_iter_bound = 5.0;\
    for (float x = -sample_iter_bound; x <= sample_iter_bound; x += 1.0) {\
      for (float y = -sample_iter_bound; y <= sample_iter_bound; y += 1.0) {\
        vec2 coord = vTexCoord + vec2(sample_reach * x / uTexDim.x, sample_reach * y / uTexDim.y);\
        float Ix = xGradient(coord);\
        float Iy = yGradient(coord);\
        float It = tGradient(coord);\
        sIxIx += Ix * Ix;\
        sIyIy += Iy * Iy;\
        sIxIy += Ix * Iy;\
        sIxIt += Ix * It;\
        sIyIt += Iy * It;\
      }\
    }\
    float ad_m_bc = sIxIx * sIyIy - sIxIy * sIxIy;\
    mat2 invA = mat2(sIyIy, -sIxIy, -sIxIy, sIxIx) / ad_m_bc;\
    vec2 uv = invA * -vec2(sIxIt, sIyIt);\
    \
    float quot = 10.0;\
    gl_FragColor = vec4(uv.x/quot + 0.5, uv.y/quot + 0.5, 0.0, 1.0);\
  }\
  ";

  NPR.Shader.call(this, vertex_src, fragment_src);
  this.attributes = {"VertexPositionBuffer" : gl.getAttribLocation(this.program, "aVertexPosition"),
                     "TextureCoordinateBuffer"     : gl.getAttribLocation(this.program, "aVertexTexcoord")};
  this.setUniforms({
    "uTexDim" : [640, 480]
  });
}

NPR.OpticalFlowShader.prototype = Object.create(NPR.Shader.prototype);
//////////////////////////////////////
// src\Shaders\OutlineShader.js
//////////////////////////////////////
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
//////////////////////////////////////
// src\Shaders\PainterlyBillboardShader.js
//////////////////////////////////////
//
// A shader for painterly rendering of instanced quad billboards.
// Note that this requires 4 vertex texture units.
//
// Uniforms:
//   sampler2D uBrushTexture - the texture that defines the brush alpha.
//   sampler2D uColorTexture - a framebuffer texture of the rendered image.
//   sampler2D uDepthTexture - a framebuffer texture of the depth pass for occlusion culling.
//   sampler2D uInstanceAttrTex - the texture sampler for per-instance variables (position).
//   float uAttrTexDim  - the square dimension of the attribute texture.
//   vec2 uScale - the uniform scale (2d geometry positions are normalized)
//
// Attributes:
//   vec2 "VertexPositionBuffer" => aVertexPosition : The 2d position of the point in graftal space.
//   float "InstanceIDBuffer"    => aInstanceID : The instance id that the position belongs to.

var NPR = NPR || {};

NPR.PainterlyBillboardShader = function() {

  var gl = NPR.gl;

  var vertex_src = "\
    uniform mat4 uMVMatrix;\
    uniform mat4 uPMatrix;\
    uniform mat3 uNMatrix;\
    uniform float uAttrTexDim;\
    uniform vec2 uScale;\
    \
    uniform sampler2D uBrushTexture;\
    uniform sampler2D uColorTexture;\
    uniform sampler2D uDepthTexture;\
    uniform sampler2D uInstanceAttrTex;\
    \
    attribute vec2 aVertexPosition;\
    attribute float aInstanceID;\
    \
    varying vec2 vTexCoord;\
    varying float vFacingRatio;\
    varying vec4 vColor;\
    \
    vec2 attrTexCell(float idx) {\
        float r = floor(idx / uAttrTexDim);\
        float c = mod(idx, uAttrTexDim);\
        float drc = 0.5 / uAttrTexDim;\
        vec2 attrTc = vec2(c/uAttrTexDim+drc, r/uAttrTexDim+drc);\
        return attrTc;\
    }\
    \
    void main(void) {\
      float pi = 3.14159265358;\
      vec2 attrTc = attrTexCell(2.0 * aInstanceID);\
      vec4 instpos = texture2D(uInstanceAttrTex, attrTc);\
      vec3 instnorm = texture2D(uInstanceAttrTex, attrTexCell(2.0 * aInstanceID + 1.0)).xyz;\
      vec4 mvpos = uMVMatrix * instpos;\
      vec4 mvppos = uPMatrix * mvpos;\
      vec2 screen_coord = mvppos.xy / 2.0 / mvppos.w + vec2(0.5, 0.5);\
      vColor = texture2D(uColorTexture, screen_coord);\
      vTexCoord = aVertexPosition;\
      \
      /* Project normal to the screen. */\
      /*vec4 p1 = mvppos;\
      vec4 p2 = instpos + vec4(instnorm.xyz, 1.0);\
      p2 = uPMatrix * uMVMatrix * p2;\
      vec3 projnorm = (p2 - p1).xyz;\
      projnorm = normalize(projnorm);*/\
      vec3 projnorm = uNMatrix * instnorm.xyz;\
      float dz = -projnorm.z; projnorm.z=projnorm.y; projnorm.y=dz;\
      projnorm.z = 0.0;\
      projnorm = normalize(projnorm);\
      \
      /* Facing Ratio */\
      vec3 mvn = uNMatrix * instnorm;\
      vFacingRatio = dot(normalize(mvn), vec3(0,0,1));\
      \
      /* Rotation around screen normal. */\
      vec2 tpos = aVertexPosition - vec2(0.5, 0.5);\
      tpos = tpos * uScale;\
      float angle = atan(projnorm.y, projnorm.x) - pi/2.0;\
      float ox  = tpos.x;\
      tpos.x = tpos.x * cos(angle) - tpos.y * sin(angle);\
        tpos.y = ox * sin(angle) + tpos.y * cos(angle);\
      \
      gl_Position = mvppos;\
      gl_Position.xy = gl_Position.xy + tpos;\
    }\
  "

  var fragment_src = "\
  precision mediump float;\
  \
  uniform sampler2D uBrushTexture;\
  \
  varying float vFacingRatio;\
  varying vec4 vColor;\
  varying vec2 vTexCoord;\
  \
  void main(void) {\
    /*if (vFacingRatio < 0.5) discard;*/\
    float fade = (vFacingRatio-0.5)/0.5;\
    vec4 brushTexCol = texture2D(uBrushTexture, vTexCoord);\
    gl_FragColor.a = min(0.9, brushTexCol.a);\
    gl_FragColor.a = gl_FragColor.a * fade;\
    gl_FragColor.rgb = vColor.rgb * gl_FragColor.a;\
  }\
  "

  NPR.Shader.call(this, vertex_src, fragment_src);
  this.attributes = {"VertexPositionBuffer" : gl.getAttribLocation(this.program, "aVertexPosition"),
                     "InstanceIDBuffer"     : gl.getAttribLocation(this.program, "aInstanceID")};

}

NPR.PainterlyBillboardShader.prototype = Object.create(NPR.Shader.prototype);
//////////////////////////////////////
// src\Shaders\TextureShader.js
//////////////////////////////////////
//
// A flat texture shader.
//

var NPR = NPR || {};

NPR.TextureShader = function() {

  var gl = NPR.gl;

  var vertex_src = "\
  attribute vec3 aVertexPosition;\
  attribute vec2 aVertexTexcoord;\
  uniform mat4 uMVMatrix;\
  uniform mat4 uPMatrix;\
  varying vec2 vTexCoord;\
  void main(void) {\
    vTexCoord = aVertexTexcoord;\
    vec4 mvpos = uMVMatrix * vec4(aVertexPosition, 1.0);\
  	gl_Position = uPMatrix * mvpos;\
  }\
  "

  var fragment_src = "\
  #ifdef GL_ES\n\
  	precision highp float;\n\
  #endif\n\
  uniform sampler2D uTexture;\
  varying vec2 vTexCoord;\
  uniform vec2 uScale;\
  \
  void main(void) {\
      vec2 tc = vTexCoord * uScale;\
      if (uScale.y < 0.0 && uScale.y >= -1.1) {\
        tc.y = 1.0 - vTexCoord.y;\
      }\
      vec4 texcol = texture2D(uTexture, tc);\
      gl_FragColor = texcol;\
  }\
  "

  NPR.Shader.call(this, vertex_src, fragment_src);
  this.attributes = {
    "VertexPositionBuffer" : gl.getAttribLocation(this.program, "aVertexPosition"),
    "TextureCoordinateBuffer" : gl.getAttribLocation(this.program, "aVertexTexcoord")
  }
  this.setUniforms({
    'uScale' : [1,1]
  });
}

NPR.TextureShader.prototype = Object.create(NPR.Shader.prototype);
