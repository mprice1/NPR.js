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