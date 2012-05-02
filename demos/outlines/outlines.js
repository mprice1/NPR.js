// Javascript Document.
var canvas3d;
var mousedown;
var sphere;
var cube;

// Shader declarations.
var shader2d;
var shader3d;
var painterly_shader;
var depthshader;
// Render passes.
var depth_pass;
var painterly_pass;
var color_fb;
// Textures.
var edge_attr_tex;
var edge_index_attrs;
var edge_index_buffer;
var quad_edge_elements;
var stroke_tex;


var billboard_buffers;
var color = [0, 0, 0];
var stroke_width = 1.0;
var stroke_ctr_dist_factor = 0;
var stroke_repeat = 25.0;

var stroke_texs = {
  "t1" : "../../images/strbrush.png",
  "t2" : "../../images/stra.png"
}
var models = {
  "blob" : "../../model/blob_notex.json.js",
  "cube" : "../../model/smooth_cube_notex.json.js"
}

	// Resamples the sphere.
	// Deletes the old ones.
	function rebuild() {
		var gl = NPR.gl;
		if (!sphere.loaded) return;
		// gl.deleteBuffer(sphere.RandomSampleBuffer);
		if(billboard_buffers) {
		  gl.deleteBuffer(billboard_buffers['VertexPositionBuffer']);
		  gl.deleteBuffer(billboard_buffers['InstanceIDBuffer']);
	 	  gl.deleteTexture(billboard_attr_tex);
	    }

		var sampcontainer = [];
		var sampvecs = [];
		var sampnormvecs = [];
	    sphere.makeRandomSampleBuffers(num_strokes, sampcontainer);
		for (var i =0; i < sampcontainer[0].length; i+=3) {
		  var vec = [];
		  vec[0] = sampcontainer[0][i];
		  vec[1] = sampcontainer[0][i+1];
		  vec[2] = sampcontainer[0][i+2];
		  sampvecs[i/3] = vec;
		  var nvec = [];
		  nvec[0] = sampcontainer[1][i];
		  nvec[1] = sampcontainer[1][i+1];
		  nvec[2] = sampcontainer[1][i+2];
		  sampnormvecs[i/3] = nvec;		  
	    }
	    billboard_attr_tex = NPR.MakeAttributeTexture([sampvecs, sampnormvecs]);

	    billboard_buffers = NPR.createInstancedBillboardBuffers(NPR.gl, num_strokes);
	}

function outline_init() {
	//
	// DAT GUI initialization.
	//
	props = {     "scale X" : 1.0,
				  "scale Y" : 1.0,
				  "stroke_width" : 1,
          "stroke_repeat" : 25,
				  "color" : [0, 0, 0],
          "stroke_ctr_dist_factor" : 0,
          "stroketex" : "t1",
          "model" : "blob",
				  "rebuild" : rebuild };
	var gui = new dat.GUI();
	gui.add(props, 'stroke_width', 0, 10).onChange(function(val){ stroke_width = val;} );
  gui.add(props, 'stroke_repeat', 0, 100).onChange(function(val){ stroke_repeat = val;} );
  gui.add(props, 'stroketex', {Stroke1: 't1', Dashed: 't2'}).onChange(function(val){strokeChanged(val);});
  gui.add(props, 'model', {Blob: 'blob', Cube: 'cube'}).onChange(function(val){modelChanged(val);});
  gui.add(props, 'stroke_ctr_dist_factor', 0, 1).onChange(function(val){ stroke_ctr_dist_factor = val;} );
  gui.addColor(props, 'color').onChange(function(col){ color[0] = col[0]/255; color[1] = col[1]/255; color[2] = col[2]/255;});
	gui.add(props, 'rebuild');

  function strokeChanged(name) {
    stroke_tex = NPR.loadTexture(stroke_texs[name]);
  }
  function modelChanged(name) {
      cube = new NPR.Mesh();
    cube.load(models[name], 
    function(){
      var eb = uploadEdgeMesh(makeEdgeMesh(cube));
      edge_attr_tex = eb[0];
      edge_index_attrs = eb[1];
      edge_index_buffer = eb[2];
      quad_edge_elements = eb[3];
      cube.EdgeIndicesBuffer = edge_index_attrs;
      cube.EdgeElementsBuffer = edge_index_buffer;
      cube.EdgeQuadElementsBuffer = quad_edge_elements;
    });
  }

	//
	// Real initialization.
	//
	canvas3d = document.getElementById("main_canvas");
	NPR.start(canvas3d);
	var gl = NPR.gl;
	stroke_tex = NPR.loadTexture("../../images/strbrush.png");

	//sphere = new NPR.Mesh();
	//sphere.load("../../model/blob.json.js", function(){rebuild();});
	cube = new NPR.Mesh();
	cube.load("../../model/smooth_cube_notex.json.js", 
		function(){
			var eb = uploadEdgeMesh(makeEdgeMesh(cube));
			edge_attr_tex = eb[0];
			edge_index_attrs = eb[1];
			edge_index_buffer = eb[2];
			quad_edge_elements = eb[3];
			cube.EdgeIndicesBuffer = edge_index_attrs;
			cube.EdgeElementsBuffer = edge_index_buffer;
			cube.EdgeQuadElementsBuffer = quad_edge_elements;
		});

	//
	// Simple shader for 2d points.
	//
	var vert_src = "\
	  uniform mat4 uMVMatrix;\
	  uniform mat4 uPMatrix;\
	  \
	  attribute vec2 aVertexPosition;\
	  void main(void) {\
	  	gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 0.0, 1.0);\
	  }\
	"
	var frag_src = "\
	precision mediump float;\
	\
	void main(void) {\
	  gl_FragColor = vec4(1.0,0.5,0.5,1.0);\
	}\
	"
	shader2d = new NPR.Shader(vert_src, frag_src);
	shader2d.attributes = {"VertexPositionBuffer" : gl.getAttribLocation(shader2d.program, "aVertexPosition")};

	//
	// Simple flat color shader for 3d stuff.
	//
	vert_src = "\
  \
  uniform vec2 uScreenDim;\
  uniform sampler2D uDepthTex;\
  varying float vDepthTexVal;\
  varying vec2 screen_coord;\
  \
	  uniform mat4 uMVMatrix;\
	  uniform mat4 uPMatrix;\
	  uniform mat3 uNMatrix;\
	  \
	  attribute vec3 aVertexPosition;\
	  attribute vec3 aVertexNormal;\
	  varying vec3 vPosition;\
	  varying float vLightIntensity;\
	  varying vec3 vNormal;\
	  void main(void) {\
	  	vPosition = aVertexPosition;\
	  	vNormal = uNMatrix * aVertexNormal;\
	  	vLightIntensity = dot(vNormal, normalize(vec3(0,1.0,1.0)));\
	  	gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
      \
      vec2 dScreen = vec2(1.0/uScreenDim.x, 1.0/uScreenDim.y);\
      screen_coord = gl_Position.xy / 2.0 / gl_Position.w + vec2(0.5, 0.5);\
      vDepthTexVal = texture2D(uDepthTex, screen_coord).r;\
      /* Sample in a small window around the screen point and take the lowest depth  */\
      /* In order to combat the inherent problems of sampling on edges */\
      for (int dx = -1; dx <= 1; dx++) {\
        for (int dy = -1; dy <= 1; dy++) {\
          vec2 dsc = screen_coord + dScreen * vec2(float(dx), float(dy));\
          float dd = texture2D(uDepthTex, dsc).r;\
          vDepthTexVal = min(vDepthTexVal, dd);\
        }\
      }\
	  }\
	"
	frag_src = "\
	precision mediump float;\
	\
  uniform sampler2D uDepthTex;\
  varying float vDepthTexVal;\
  varying vec2 screen_coord;\
  \
	uniform vec3 uColor;\
	\
	varying vec3 vPosition;\
	varying float vLightIntensity;\
	varying vec3 vNormal;\
	void main(void) {\
		gl_FragColor = vec4( vDepthTexVal, vDepthTexVal, vDepthTexVal, 1.0);\
    gl_FragColor.r = vDepthTexVal;\
    float d = texture2D(uDepthTex, screen_coord).r;\
    /*gl_FragColor = vec4(d,d,d,1.0);*/\
	}\
	"
	shader3d = new NPR.Shader(vert_src, frag_src);
	shader3d.attributes = {"VertexPositionBuffer" : gl.getAttribLocation(shader3d.program, "aVertexPosition"),
						   "VertexNormalBuffer" : gl.getAttribLocation(shader3d.program, "aVertexNormal")};

    lineshader = new NPR.OutlineShader();
    lineshader.setUniforms({"uNear" : 0.02, "uFar":0.8 });

    depth_pass = new NPR.DepthPass(false);
    depth_pass.setUniforms({"uNear" : 0.02, "uFar":0.8 });

	//
	// Mouse events.
	//
	canvas3d.onmousedown = function(e) {
      mousedown = true;
      var p = getMousePos(canvas3d, e);
    }
    document.onmouseup = function(e) {
      mousedown = false;
    }
    document.onmousemove = function(e) { 
      if(mousedown) {
	    var p = getMousePos(canvas3d, e);
	  }
    }
    document.onkeydown = function(e) {
    	switch (e.keyCode) {
    		case 82:  // R
    		  break;
    		case 68:  // D
    		  break;
    		default:
    		  break;
    	}
    }
}

function update() {
  NPR.update();
}

function draw() {  
	if (!edge_attr_tex) return;
  var gl = NPR.gl;
  //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // Update the depth buffer.
  gl.enable(gl.DEPTH_TEST);
  depth_pass.updateFramebuffer(drawMainModel);

  gl.lineWidth(50.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0,0,gl.viewportWidth, gl.viewportHeight);
  NPR.pMatrix = mat4.perspective(45, gl.viewportWidth/gl.viewportHeight, 0.5, 7, NPR.pMatrix);
  
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  shader3d.setUniforms({ "uColor" : [1,0,.5],
                         "uDepthTex" : 0,
                         "uScreenDim" : [gl.viewportWidth, gl.viewportHeight] });
  gl.activeTexture(gl.TEXTURE0);
  depth_pass.bindTexture();
  NPR.mvPushMatrix();
  	mat4.identity(NPR.mvMatrix);
  	mat4.translate(NPR.mvMatrix, [0,0,-5]);
  	mat4.rotate(NPR.mvMatrix, NPR.frame/50.0, [1,1,0]);    
    var nMatrix = mat3.create();  nMatrix = mat3.transpose(mat4.toInverseMat3(NPR.mvMatrix, nMatrix));
  	shader3d.setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix, nMatrix); 
  	shader3d.drawModel(cube);
  	lineshader.setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix, nMatrix); 
  NPR.mvPopMatrix();
  

  gl.disable(gl.DEPTH_TEST);
  lineshader.setUniforms({ "uAttrTex" : 0,
						   "uAttrTexDim" : edge_attr_tex.dim,              
						   "uStrokeTex" : 1,
               "uDepthTex"  : 2,
               "uScreenDim" : [gl.viewportWidth, gl.viewportHeight],
               "uStrokeWidth" : stroke_width,
               "uStrokeRepeat" : stroke_repeat,
               "uColor" : color,
               "uStrokeRepeatDFactor" : stroke_ctr_dist_factor });
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, edge_attr_tex);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, stroke_tex);
  gl.activeTexture(gl.TEXTURE2);
  depth_pass.bindTexture();
  lineshader.drawModel(cube, gl.TRIANGLES, "EdgeQuadElementsBuffer", true);

 // NPR.DrawTexture(depth_pass.framebuffer.texture)
}

// This is the draw call that can be overridden (i.e. for a RenderPass).
function drawMainModel(shader, mode, buff) {
  var gl = NPR.gl;
  gl.viewport(0,0,gl.viewportWidth, gl.viewportHeight);
  NPR.pMatrix = mat4.perspective(45, gl.viewportWidth/gl.viewportHeight, 0.5, 7, NPR.pMatrix);
  shader.bind();
  NPR.mvPushMatrix();
  	mat4.identity(NPR.mvMatrix);
  	mat4.translate(NPR.mvMatrix, [0,0,-5]);
  	mat4.rotate(NPR.mvMatrix, NPR.frame/50.0, [1,1,0]);
  	var nMatrix = mat3.create();  nMatrix = mat3.transpose(mat4.toInverseMat3(NPR.mvMatrix, nMatrix));
  	shader.setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix, nMatrix);
  	shader.drawModel(cube, mode, buff);

  NPR.mvPopMatrix();
}

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

// Given a Mesh object, construct an array of tuples for each edge.  Each entry will look like:
// [[v0], [v1], [v2], [v3], [n0], [n1], r]
function makeEdgeMesh(mesh) {
  //console.log("making edge mesh for cube");
  // Reshape the mesh arrays so they are easier to index.
  var verts = [];
  var normals = [];
  var tris = [];
  for (var i = 0; i < mesh.positions.length; i+=3) {
  	verts.push([mesh.positions[i], mesh.positions[i+1], mesh.positions[i+2]]);
  	normals.push([mesh.normals[i], mesh.normals[i+1], mesh.normals[i+2]]);
  }
  for (var i = 0; i < mesh.indices.length; i+=3) {
  	tris.push([mesh.indices[i], mesh.indices[i+1], mesh.indices[i+2]]);
  }
  //console.log("verts (" + verts.length + "): " + verts);
  //console.log("normals (" + normals.length + "): " + normals);
  //console.log("tris (" + tris.length + "): " +tris);
  // Keep track of edges made (by index pairs sorted in increasing order), so that we know whether
  var edge_tris = {};
  // Add each triangle index to each of it's edges.
  for (var i = 0; i < tris.length; i++) {
  	var e01rev = false;  var e12rev = false;  var e20rev = false;
  	var e01 = [tris[i][0], tris[i][1]];  if (e01[0] > e01[1]) { e01.reverse(); e01rev = true;}
  	var e12 = [tris[i][1], tris[i][2]];  if (e12[0] > e12[1]) { e12.reverse(); e12rev = true;}
  	var e20 = [tris[i][2], tris[i][0]];  if (e20[0] > e20[1]) { e20.reverse(); e20rev = true;}
  	if (!edge_tris[e01]) edge_tris[e01] = [];
  	edge_tris[e01][e01rev ? 1 : 0] = i;
  	if (!edge_tris[e12]) edge_tris[e12] = [];
  	edge_tris[e12][e12rev ? 1 : 0] = i;
  	if (!edge_tris[e20]) edge_tris[e20] = [];
  	edge_tris[e20][e20rev ? 1 : 0] = i;
  }
  // Now for each edge, build the tuple.
  function otherVert(t,e) { 
  	if (t[0]!=e[0]&&t[0]!=e[1]) return t[0];
  	if (t[1]!=e[0]&&t[1]!=e[1]) return t[1];
  	return t[2];
  }
  var tuples = [];
  for (var estr in edge_tris) {
  	etris = edge_tris[estr];
  	// When you use an array as a key, it gets turned into a string.
  	var e = estr.split(',');
  	if (e[0]==="") e[0]=undefined;
  	var v0, v1, v2, v3, n0, n1, r;
  	if (etris.length==1 || etris[0]==undefined) {
  		var t1;
  		if (etris[0]!==undefined) t1 = tris[etris[0]];
  		else t1 = tris[etris[1]];
  		v0 = verts[e[0]];
  		v1 = verts[e[1]];
  		v2 = verts[otherVert(t1, e)];
  		v3 = v2;
  		n0 = normals[e[0]];
  		n1 = normals[e[1]];
  		r = Math.random(); 
  	} else {
  		// Assume there are two valid triangles.
  		var t1 = tris[etris[0]];
  		var t2 = tris[etris[1]];
  		v0 = verts[e[0]];
  		v1 = verts[e[1]];
  		v2 = verts[otherVert(t1, e)];
  		v3 = verts[otherVert(t2, e)];
  		n0 = normals[e[0]];
  		n1 = normals[e[1]];
  		r = Math.random();  	
  		tuples.push([v0, v1, v2, v3, n0, n1, r]);	
  	}
  	
  }
  return tuples;
}

// Given an edge mesh as a list of tuples, upload the data to the GPU.
// Uploads per-edge vertices, normals, random texture scalar as a 3 component attribute texture.
// Uploads an attribute index VBO of vec2's, 4 per edge, that looks like: [0|1|2|3, edge_id]
// Finally, uploads an element array buffer - this should be different for different edge modes.
//   For starters, it will have the indices for the first two verts of each edge (thin line algorithm).
function uploadEdgeMesh(em) {
	var gl = NPR.gl;
  // Attribute texture.
  // We need to inflate the 'r' scalar to a vec3 to put it in the texture.
  var v0s = [];
  var v1s = [];
  var v2s = [];
  var v3s = [];
  var n0s = [];
  var n1s = [];
  var rs = [];
  for (var  i = 0; i < em.length; i++) {
  	var r = em[i][6];
  	em[i][6] = [r, r, r];
  	v0s.push(em[i][0]);
  	v1s.push(em[i][1]);
  	v2s.push(em[i][2]);
  	v3s.push(em[i][3]);
  	n0s.push(em[i][4]);
  	n1s.push(em[i][5]);
  	 rs.push(em[i][6]);
  }
  var attr_tex = NPR.MakeAttributeTexture([v0s, v1s, v2s, v3s, n0s, n1s, rs]);

  // Attribute VBO for edge indices.
  var attr_index_data = [];
  for (var  i = 0; i < em.length; i++) {
  	attr_index_data = attr_index_data.concat([0, i, 1, i, 2, i, 3, i]);
  }
  var edge_index_vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, edge_index_vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(attr_index_data), gl.STATIC_DRAW);
  edge_index_vbo.itemSize = 2;
  edge_index_vbo.numItems = attr_index_data.length / 2;

  // Element array buffer to draw for thin-line algorithm.
  var thin_line_indices = [];
  var ctr = 0;
  for (var i = 0; i < em.length; i++) {
  	thin_line_indices.push(ctr);
  	thin_line_indices.push(ctr+1);
  	ctr += 4;
  }
  var element_index_vbo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, element_index_vbo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(thin_line_indices), gl.STATIC_DRAW);
  element_index_vbo.itemSize = 1;
  element_index_vbo.numItems = thin_line_indices.length;

  // Element array buffer for thick-line quads.  Ideally this would be quads (as it is in the paper),
  // but since that's deprecated, we do two triangles per edge.
  var thick_line_indices = [];
  ctr = 0;
  for (var i = 0; i < em.length; i++) {
  	thick_line_indices = thick_line_indices.concat([ctr, ctr+1, ctr+2, ctr, ctr+2, ctr+3]);
  	ctr+=4;
  }
  var quad_element_index_vbo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quad_element_index_vbo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(thick_line_indices), gl.STATIC_DRAW);
  quad_element_index_vbo.itemSize = 1;
  quad_element_index_vbo.numItems = thick_line_indices.length;

  return [attr_tex, edge_index_vbo, element_index_vbo, quad_element_index_vbo];
}