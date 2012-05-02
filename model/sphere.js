// JavaScript Document
function createSphere(stacks, slices) {
	var gl = NPR.gl;
    var sphere = new Object();
	var vertex_positions = [];
	var texture_coordinates = [];
	var vertex_tangents = [];
    var debug_norms = [];
	var debug_tans = [];
	var north = [0, 0, 1.0];
	var px, py, pz;
	var dbgnx, dbgny, dbgnz;
	var dbgtx, dbgty, dbgtz
   var vct = 0;
   var txct = 0;
   var tanct = 0;
   for (var curslice=0; curslice<slices; curslice++) {
	   var slice_angle_low = curslice/slices * 2 * Math.PI;
	   var slice_angle_high = (curslice + 1)/slices *2 * Math.PI;
	   
	   for (var curstack = 0; curstack<stacks; curstack++) {
	     var stack_angle_low = curstack/stacks * Math.PI;
		 var stack_angle_high = (curstack + 1)/stacks * Math.PI;
		 
		 //pos
		 vertex_positions[vct] = 
		 Math.sin(stack_angle_low)*Math.cos(slice_angle_low);
		 px = vertex_positions[vct];
		 dbgnx = vertex_positions[vct];
		 vct++;
		 
		 vertex_positions[vct] =
		 Math.sin(stack_angle_low)*Math.sin(slice_angle_low);
		 py = vertex_positions[vct];
		 dbgny = vertex_positions[vct];
		 vct++;
		 
		 vertex_positions[vct] = Math.cos(stack_angle_low);
		 pz = vertex_positions[vct];
		 dbgnz = vertex_positions[vct];
		 vct++;
		
		 dbgnx = px;
		 dbgny = py;
		 dbgnz = pz;
		 
		 //tex
		 texture_coordinates[txct++] = slice_angle_low /(2*Math.PI);
		 texture_coordinates[txct++] = stack_angle_low/Math.PI;
		 //tan
		 dnx = -px;
		 dny = -py;
		 dnz = 1.0 - pz;
		 dndotn = dnx * px + dny * py + dnz * pz;
		 dnx -= px * dndotn;
		 dny -= py * dndotn;
		 dnz -= pz * dndotn;
		 vertex_tangents[tanct++] = dnx;
		 vertex_tangents[tanct++] = dny;
		 vertex_tangents[tanct++] = dnz;
		 dbgtx = dnx;
		 dbgty = dny;
		 dbgtz = dnz;
		 
		 
		 
		 //pos
		 px = vertex_positions[vct++] =
		 Math.sin(stack_angle_high)*Math.cos(slice_angle_low);
		 py = vertex_positions[vct++] = 
		 Math.sin(stack_angle_high)*Math.sin(slice_angle_low);
		 pz = vertex_positions[vct++] = Math.cos(stack_angle_high);
		 //tex
		 texture_coordinates[txct++] = slice_angle_low/(2*Math.PI);
		 texture_coordinates[txct++] = stack_angle_high/Math.PI;
		 //tan
		 dnx = -px;
		 dny = -py;
		 dnz = 1.0 - pz;
		 dndotn = dnx * px + dny * py + dnz * pz;
		 dnx -= px * dndotn;
		 dny -= py * dndotn;
		 dnz -= pz * dndotn;
		 vertex_tangents[tanct++] = dnx;
		 vertex_tangents[tanct++] = dny;
		 vertex_tangents[tanct++] = dnz;
		 
		 //pos
		 px = vertex_positions[vct++] = 
		 Math.sin(stack_angle_high)*Math.cos(slice_angle_high);
		 py = vertex_positions[vct++] = 
		 Math.sin(stack_angle_high)*Math.sin(slice_angle_high);
		 pz = vertex_positions[vct++] = Math.cos(stack_angle_high);
		 //tex
		 texture_coordinates[txct++] = slice_angle_high/(2*Math.PI);
		 texture_coordinates[txct++] = stack_angle_high/Math.PI;
		 //tan
		 dnx = -px;
		 dny = -py;
		 dnz = 1.0 - pz;
		 dndotn = dnx * px + dny * py + dnz * pz;
		 dnx -= px * dndotn;
		 dny -= py * dndotn;
		 dnz -= pz * dndotn;
		 vertex_tangents[tanct++] = dnx;
		 vertex_tangents[tanct++] = dny;
		 vertex_tangents[tanct++] = dnz;
		 
		 //pos
		 px = vertex_positions[vct++] = 
		 Math.sin(stack_angle_low)*Math.cos(slice_angle_low);
		 py = vertex_positions[vct++] = 
		 Math.sin(stack_angle_low)*Math.sin(slice_angle_low);
		 pz = vertex_positions[vct++] = Math.cos(stack_angle_low);
		 //tex
		 texture_coordinates[txct++] = slice_angle_low/(2*Math.PI);
		 texture_coordinates[txct++] = stack_angle_low/Math.PI;
		 //tan
		 dnx = -px;
		 dny = -py;
		 dnz = 1.0 - pz;
		 dndotn = dnx * px + dny * py + dnz * pz;
		 dnx -= px * dndotn;
		 dny -= py * dndotn;
		 dnz -= pz * dndotn;
		 vertex_tangents[tanct++] = dnx;
		 vertex_tangents[tanct++] = dny;
		 vertex_tangents[tanct++] = dnz;
		 
		 //pos
		 px = vertex_positions[vct++] = 
		 Math.sin(stack_angle_high)*Math.cos(slice_angle_high);
		 py = vertex_positions[vct++] = 
		 Math.sin(stack_angle_high)*Math.sin(slice_angle_high);
		 pz = vertex_positions[vct++] = Math.cos(stack_angle_high);
		 //tex
		 texture_coordinates[txct++] = slice_angle_high/(2*Math.PI);
		 texture_coordinates[txct++] = stack_angle_high/Math.PI;
		 //tan
		 dnx = -px;
		 dny = -py;
		 dnz = 1.0 - pz;
		 dndotn = dnx * px + dny * py + dnz * pz;
		 dnx -= px * dndotn;
		 dny -= py * dndotn;
		 dnz -= pz * dndotn;
		 vertex_tangents[tanct++] = dnx;
		 vertex_tangents[tanct++] = dny;
		 vertex_tangents[tanct++] = dnz;
		 
		 //pos
		 px = vertex_positions[vct++] =  
		 Math.sin(stack_angle_low)*Math.cos(slice_angle_high);
		 py = vertex_positions[vct++] = 
		 Math.sin(stack_angle_low)*Math.sin(slice_angle_high);
		 pz = vertex_positions[vct++] = Math.cos(stack_angle_low);
		 //tex
		 texture_coordinates[txct++] = slice_angle_high/(2*Math.PI);
		 texture_coordinates[txct++] = stack_angle_low/Math.PI;
		 //tan
		 dnx = -px;
		 dny = -py;
		 dnz = 1.0 - pz;
		 dndotn = dnx * px + dny * py + dnz * pz;
		 dnx -= px * dndotn;
		 dny -= py * dndotn;
		 dnz -= pz * dndotn;
		 vertex_tangents[tanct++] = dnx;
		 vertex_tangents[tanct++] = dny;
		 vertex_tangents[tanct++] = dnz;
		 
		 
		 // DEBUG NORMALS //
		 
		debug_norms.push(dbgnx,
		                  dbgny,
						  dbgnz,
						  dbgnx + 0.1*dbgnx,
						  dbgny + 0.1*dbgny,
						  dbgnz + 0.1*dbgnz);
		/*debug_tans.push(dbgnx,
		                  dbgny,
						  dbgnz,
						  dbgnx + 0.1*dbgtx,
						  dbgny + 0.1*dbgty,
						  dbgnz + 0.1*dbgtz);*/
	   }
   }
   //normals
   sphere.VertexNormalBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, sphere.VertexNormalBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertex_positions), gl.STATIC_DRAW);
   sphere.VertexNormalBuffer.itemSize = 3;
   sphere.VertexNormalBuffer.numItems = stacks * slices * 6;
   //verts
   sphere.VertexPositionBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, sphere.VertexPositionBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertex_positions), gl.STATIC_DRAW);
   sphere.VertexPositionBuffer.itemSize = 3;
   sphere.VertexPositionBuffer.numItems = stacks * slices * 6;
   //texs
   sphere.TextureCoordinateBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, sphere.TextureCoordinateBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texture_coordinates), gl.STATIC_DRAW);
   sphere.TextureCoordinateBuffer.itemSize = 2;
   sphere.TextureCoordinateBuffer.numItems = stacks * slices * 6;
   //tans
   /*sphere.VertexTangentBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, sphere.VertexTangentBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertex_tangents), gl.STATIC_DRAW);
   sphere.VertexTangentBuffer.itemSize = 3;
   sphere.VertexTangentBuffer.numItems = stacks * slices * 6;*/

   //debug norms
   /*sphere.DebugNormalBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, sphere.DebugNormalBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(debug_norms), gl.STATIC_DRAW);
   sphere.DebugNormalBuffer.itemSize = 3;
   sphere.DebugNormalBuffer.numItems = debug_norms.length / 3;*/
   //debug tans
   /* sphere.DebugTangentBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, sphere.DebugTangentBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(debug_tans), gl.STATIC_DRAW);
   sphere.DebugTangentBuffer.itemSize = 3;
   sphere.DebugTangentBuffer.numItems = debug_tans.length / 3;*/
   
   
   
   return sphere;
 }
 
 function drawDebugLines(sphere) {
   gl.bindBuffer(gl.ARRAY_BUFFER, sphere.DebugNormalBuffer);
   gl.vertexAttribPointer(redShaderProgram.vertexPositionAttribute,
       sphere.DebugNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.LINES, 0, sphere.DebugNormalBuffer.numItems);
 }

 // Sample n points on the unit sphere using rejection sampling.
function sampleSpherePoints(num_samples) {
	var samples = [];
	var samples_generated = 0;
	while (samples_generated < num_samples) {
		x = -2 * Math.random() + 1.0;
		y = -2 * Math.random() + 1.0;
		z = -2 * Math.random() + 1.0;
		var length = Math.sqrt(x*x + y*y + z*z);
		if (length <= 1.0) {
			samples[3 * samples_generated] = x / length;
			samples[3 * samples_generated + 1] = y / length;
			samples[3 * samples_generated + 2] = z / length;
			samples_generated++;
		} 
	}
	return samples;
}

// Sample n points on the unit sphere using rejection sampling,
// and bind the results to a buffer, attaching it to the sphere
// passed in.
function makeSphereSampleBuffer(num_samples, sphere, out_array_container) {
  var gl = NPR.gl;
  samples = sampleSpherePoints(num_samples);
  if (out_array_container) out_array_container.samples = samples;
  sphere.RandomSampleBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphere.RandomSampleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(samples), gl.STATIC_DRAW);
  sphere.RandomSampleBuffer.itemSize = 3;
  sphere.RandomSampleBuffer.numItems = num_samples;
}
