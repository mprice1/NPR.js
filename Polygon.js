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