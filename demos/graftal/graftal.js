// Javascript Document.
var maincanvas; var ctx;
var canvas3d; var ctx3d;

var is_3d = false;
var polybuffer;
var graftal_buffers;
var graftal_outline_buffers;
var mousedown;
var polygon;
var polytype = 0;

var sphere;

// Shader declarations.
var shdr;
var shader3d;
var graftal_shader;
var graftal_attr_tex;

var num_graftals = 100;
var graftal_scale = 1.0;
var outline_scale = .1;
var outline_dx = 0;
var outline_dy = 0;

var fill_color = [1,1,1];
var outline_color = [0,0,0];
var bgcolor = [.2,.2,.2];

var record = false;

var curmodel = 'sphere';
var models = {
	'sphere' : null,
	'blob' : '../../model/blob.json.js'
}



var presets = {
	"frond" : {
		type : "strip",
		pts : [[213, 430], [284, 429], [237, 348], [300, 375], [285, 296], [323, 337], [343, 288], [364, 305], [397, 290]],
        ox : 0,
	    oy : -0.02,
	    scale : 0.4,
	    olscale : 0.08,
	    num : 440,
	    col : '#911d1d',
	    olcol : '#521010',
	    bgcol : '#b38686'
	},
	"Squiggles" : {
		type : 'strip',
		pts : [[204,427], [223,427],  [204,378],  [220,378],  [183,331],  [191,322],  [144,310],  [147,301],  [118,279],  [126,273],  [119,236],  
				[126,244],  [160,222],  [164,230],  [186,221],  [184,232],  [230,246],  [223,257],  [241,257],  [240,268],  [268,265],  [273,275],  [286,235],  
				[306,239],  [289,211],  [299,206],  [274,195],  [273,183],  [264,194],  [257,188],  [254,205],  [242,205], [249,218], [241,225], [246,231]],
		ox : 0,
		oy : 0,
		scale : 0.7,
		olscale : 0.03,
		num : 5000,
		col : '#785c1b',
		olcol : '#0e2d07',
		bgcol : '#9bd26b'
	}
}

function graftal_init() {
	//
	// DAT GUI initialization.
	//
	gr_props = { "scale" : 1.0,
				  "outline scale" : .1,
				  "number" : 100,
				  'offset X' : 0,
				  'offset Y' : 0,
				  "color" : [255, 255, 255],
				  "outline_color" : [0, 0, 0],
				  "bgcolor" : [50,50,50],
				  "model" : "sphere",
				  "preset" : "none",
				  "rebuild" : function() { rebuild();} };
	var gui = new dat.GUI();
	gui.addColor(gr_props, 'color').onChange(function(col){ fill_color[0] = col[0]/255; fill_color[1] = col[1]/255; fill_color[2] = col[2]/255;});
	gui.addColor(gr_props, 'outline_color').onChange(function(col){ outline_color[0] = col[0]/255; outline_color[1] = col[1]/255; outline_color[2] = col[2]/255;});
	gui.addColor(gr_props, 'bgcolor').onChange(function(col){ bgcolor[0] = col[0]/255; bgcolor[1] = col[1]/255; bgcolor[2] = col[2]/255;});
	gui.add(gr_props, 'scale', 0, 10).onChange(function(val){ graftal_scale = val; } );
	gui.add(gr_props, 'outline scale', 0, 1).onChange(function(val){ outline_scale = val; } );
	gui.add(gr_props, 'offset X', -1, 1).onChange(function(val){ outline_dx = val; } );
	gui.add(gr_props, 'offset Y', -1, 1).onChange(function(val){ outline_dy = val; } );
	gui.add(gr_props, 'number', 10, 10000).onChange(function(val){ num_graftals = val;} );
	gui.add(gr_props, 'model', { Sphere: "sphere", Blob: "blob" } ).onChange(function(val) { changeModel(val); });
	gui.add(gr_props, 'preset', { None: "none", Frond: "frond", Squiggles : 'Squiggles' } ).onChange(function(val) { changePreset(val); });
	gui.add(gr_props, 'rebuild');

	// Resamples the sphere, remakes the attribute texture, and remakes the graftal buffers.
	// Deletes the old ones.
	function rebuild() {
		var gl = NPR.gl;
		gl.deleteBuffer(graftal_buffers['VertexPositionBuffer']);
		gl.deleteBuffer(graftal_buffers['InstanceIDBuffer']);
		gl.deleteTexture(graftal_attr_tex);

		var sampcontainer = {};

		if (curmodel=='sphere') {		
		  var sampvecs = [];
		  makeSphereSampleBuffer(num_graftals, sphere, sampcontainer);
		  for (var i =0; i < sampcontainer.samples.length; i+=3) {
		    var vec = [];
		    vec[0] = sampcontainer.samples[i];
		    vec[1] = sampcontainer.samples[i+1];
		    vec[2] = sampcontainer.samples[i+2];
		    sampvecs[i/3] = vec;
	      }
	      graftal_attr_tex = NPR.MakeAttributeTexture([sampvecs, sampvecs]);
	    } else {
	      var sampvecs = [];
	      var nsampvecs = [];
	      sphere.makeRandomSampleBuffers(num_graftals, sampcontainer);
	      var sa = sampcontainer[0];
	      var na = sampcontainer[1];
	      for (var i =0; i < sa.length; i+=3) {
		    var vec = [];
		    var nvec = [];
		    vec[0] = sa[i];
		    vec[1] = sa[i+1];
		    vec[2] = sa[i+2];
		    sampvecs[i/3] = vec;
		    nvec[0] = na[i];
		    nvec[1] = na[i+1];
		    nvec[2] = na[i+2];
		    nsampvecs[i/3] = nvec;
	      }
	      graftal_attr_tex = NPR.MakeAttributeTexture([sampvecs, nsampvecs]);
	    }  

	    graftal_buffers = polygon.makeInstancedVertexBuffer(NPR.gl, num_graftals);
	    var ol = polygon.makeOutlinePolygon(outline_scale, true);
	    graftal_outline_buffers = ol.makeInstancedVertexBuffer(NPR.gl, num_graftals, ol.getFlattenedTriangles());
	}

	function changeModel(name) {
		curmodel = name;
		if (curmodel=='sphere') {
			sphere = createSphere(10, 10);
			rebuild();
		} else {
			sphere = new NPR.Mesh();
			sphere.load(models[name], function() { sphere.makeBuffers(); rebuild(); });
		}
	}

	function changePreset(name) {
		if (name == 'none') return;
		var pre = presets[name];

        function hexToRgb(hex) {
          var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : null;
        }

		// Update all GUI paramaters.
        gr_props['scale'] = pre.scale;
        graftal_scale = pre.scale;
        gr_props['outline scale'] = pre.olscale;
        outline_scale = pre.olscale;
        gr_props['number'] = pre.num;
        num_graftals = pre.num;
        gr_props['offset X'] = pre.ox;
        outline_dx = pre.ox;
        gr_props['offset Y'] = pre.oy;
        outline_dy = pre.oy;
        var c = hexToRgb(pre.col);
        var oc = hexToRgb(pre.olcol);
        var bgc = hexToRgb(pre.bgcol);
        gr_props['color'] = [c.r, c.g, c.b];
        fill_color[0] = c.r/255; fill_color[1] = c.g/255; fill_color[2] = c.b/255;
        gr_props['outline_color'] = [oc.r, oc.g, oc.b];
        outline_color[0] = oc.r/255; outline_color[1] = oc.g/255; outline_color[2] = oc.b/255;
        gr_props['bgcolor'] = [bgc.r, bgc.g, bgc.b];
        bgcolor[0] = bgc.r/255; bgcolor[1] = bgc.g/255; bgcolor[2] = bgc.b/255;

        // Iterate over all controllers
        for (var i in gui.__controllers) {
          gui.__controllers[i].updateDisplay();
        }

        // Polygon stuff.
        switch (pre.type) {
        	case 'strip':
        	polygon = new NPR.TriStrip(maincanvas);
        	break;
        	case 'fan':
        	polygon = new NPR.TriFan(maincanvas);
        	break;
        	case 'tris':
        	polygon = new NPR.Triangles(maincanvas);
        	break;
        }
        
        for (var i = 0; i < pre.pts.length; i++) {
        	polygon.addPoint(pre.pts[i][0], pre.pts[i][1]);
        }

        rebuild();
	}

	//
	// Real initialization.
	//

	maincanvas = document.getElementById("main_canvas");
	ctx = maincanvas.getContext("2d");
	polygon = new NPR.Triangles(maincanvas);

	canvas3d = document.createElement("canvas");
	canvas3d.setAttribute("id", "canvas3d")
	canvas3d.width = 512;  canvas3d.height = 512;
	NPR.start(canvas3d);
	var gl = NPR.gl;


	sphere = createSphere(10, 10);
	var sampcontainer = {};
	makeSphereSampleBuffer(num_graftals, sphere, sampcontainer);
	var sampvecs = [];
	for (var i =0; i < sampcontainer.samples.length; i+=3) {
		var vec = [];
		vec[0] = sampcontainer.samples[i];
		vec[1] = sampcontainer.samples[i+1];
		vec[2] = sampcontainer.samples[i+2];
		sampvecs[i/3] = vec;
	}
	graftal_attr_tex = NPR.MakeAttributeTexture([sampvecs, sampvecs]);

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
	shdr = new NPR.Shader(vert_src, frag_src);
	shdr.attributes = {"VertexPositionBuffer" : gl.getAttribLocation(shdr.program, "aVertexPosition")};

	//
	// Simple shader for 3d points.
	//
	vert_src = "\
	  uniform mat4 uMVMatrix;\
	  uniform mat4 uPMatrix;\
	  \
	  attribute vec3 aVertexPosition;\
	  varying vec3 vPosition;\
	  void main(void) {\
	  	vPosition = aVertexPosition;\
	  	gl_PointSize = 10.0;\
	  	gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
	  }\
	"
	frag_src = "\
	precision mediump float;\
	\
	uniform vec3 uColor;\
	\
	varying vec3 vPosition;\
	void main(void) {\
	  gl_FragColor = vec4(uColor,1.0);\
	}\
	"
	shader3d = new NPR.Shader(vert_src, frag_src);
	shader3d.attributes = {"VertexPositionBuffer" : gl.getAttribLocation(shader3d.program, "aVertexPosition")};

	graftal_shader = new NPR.GraftalShader();

	//
	// Mouse events.
	//
	maincanvas.onmousedown = function(e) {
      mousedown = true;
      var p = getMousePos(maincanvas, e);
    }
    document.onmouseup = function(e) {
      mousedown = false;
    }
    document.onmousemove = function(e) { 
      if(mousedown) {
	    var p = getMousePos(maincanvas, e);
	  }
    }
    maincanvas.onclick = function(e) {
	  var p = getMousePos(maincanvas, e);
	  polygon.addPoint(p.x, p.y);
	  console.log('[' + p.x + ',' + p.y + "],");
	  try {polygon.draw();} catch(e) {}
    }
    document.onkeydown = function(e) {
    	switch (e.keyCode) {
    		case 82:
    		  resetPolygon();
    		  ctx.clearRect(0,0,maincanvas.width,maincanvas.height);
    		  break;
    		case 68:
    		  nextPolyType();
    		  ctx.clearRect(0,0,maincanvas.width,maincanvas.height);
    		  break;
    		case 65:
    		record=!record;
    		break;    		
    		default:
    		  break;
    	}
    }
}

function show3d() {
	if(!is_3d) {
		is_3d = true;
		document.getElementById("canvasholder").removeChild(maincanvas);
		document.getElementById("canvasholder").appendChild(canvas3d);
		graftal_buffers = polygon.makeInstancedVertexBuffer(NPR.gl, num_graftals);
		var ol = polygon.makeOutlinePolygon(outline_scale, true);
	    graftal_outline_buffers = ol.makeInstancedVertexBuffer(NPR.gl, num_graftals, ol.getFlattenedTriangles());
		document.getElementById("button_3d").innerHTML = "2d";
	} else {
		is_3d = false;
		document.getElementById("canvasholder").removeChild(canvas3d);
		document.getElementById("canvasholder").appendChild(maincanvas);
		document.getElementById("button_3d").innerHTML = "3d";
	}
}


function update() {
  if (!is_3d) return;
  NPR.update();
}

function draw() {
  if (record) {
  	var new_cnv = document.createElement("canvas");
  	var canv_image = new Image();
  	canv_image.onload = function() {
  		new_cnv.getContext('2d').drawImage(canv_image,0,0);
  		document.body.appendChild(new_cnv);
  		console.log(new_cnv.toDataURL());
  	}
  	canv_image.src = document.getElementById("canvas3d").toDataURL("image/png");
  }
  if (!is_3d) return;
  var gl = NPR.gl;
  gl.clearColor(bgcolor[0], bgcolor[1], bgcolor[2], 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0,0,gl.viewportWidth, gl.viewportHeight);
  NPR.pMatrix = mat4.perspective(45, gl.viewportWidth/gl.viewportHeight, 0.01, 100, NPR.pMatrix);
  mat4.identity(NPR.mvMatrix);
  shader3d.bind();
  gl.enable(gl.DEPTH_TEST);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  NPR.mvPushMatrix();
  	mat4.translate(NPR.mvMatrix, [0,0,-5]);
  	mat4.rotate(NPR.mvMatrix, NPR.frame/150.0, [1,1,0]);
  	shader3d.setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix);
  	shader3d.setUniforms({"uColor" : fill_color});
  	shader3d.drawModel(sphere);
  	graftal_shader.bind();
  	  var nMatrix = mat3.create();
      graftal_shader.setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix, mat3.transpose(mat4.toInverseMat3(NPR.mvMatrix, nMatrix)));
	  gl.bindTexture(gl.TEXTURE_2D, graftal_attr_tex);
      graftal_shader.setUniforms({"uInstanceAttrTex" : 0,
  								  "uAttrTexDim"      : graftal_attr_tex.dim,
  								   "uColor"          : fill_color,
  								   "uOffset"         : [outline_dx, outline_dy, 0],
  								   "uScale"          : graftal_scale,
  								   "uFadeColor"      : fill_color });
      graftal_shader.drawModel(graftal_buffers, gl.TRIANGLES);
  
  
 	 graftal_shader.setUniforms({"uColor"   : outline_color,
							  	 "uOffset" : [outline_dx, outline_dy, -0.01],
  							  	 "uScale"   : graftal_scale });
 	 graftal_shader.drawModel(graftal_outline_buffers, gl.TRIANGLES);
  NPR.mvPopMatrix();
  
}

function resetPolygon() {
	switch (polygon.polyType) {
		case NPR.Polygon.prototype.TRIANGLES:
			polygon = new NPR.Triangles(maincanvas);
			break;
		case NPR.Polygon.prototype.TRIANGLE_FAN:
			polygon = new NPR.TriFan(maincanvas);
			break;
		case NPR.Polygon.prototype.TRIANGLE_STRIP:
			polygon = new NPR.TriStrip(maincanvas);
			break;
	}
}

function nextPolyType() {
	polytype++;
	polytype %= 3;
	var sp = document.getElementById("polytype_span");
	switch (polytype) {
		case NPR.Polygon.prototype.TRIANGLES:
			polygon = new NPR.Triangles(maincanvas);
			sp.innerHTML = "TRIANGLES";
			break;
		case NPR.Polygon.prototype.TRIANGLE_FAN:
			polygon = new NPR.TriFan(maincanvas);
			sp.innerHTML = "TRIANGLE_FAN";
			break;
		case NPR.Polygon.prototype.TRIANGLE_STRIP:
			polygon = new NPR.TriStrip(maincanvas);
			sp.innerHTML = "TRIANGLE_STRIP";
			break;
	}
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



