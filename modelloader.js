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