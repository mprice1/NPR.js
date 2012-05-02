var NPR = NPR || {};

var models = {};
var shaders = {};
var graftal_templates = {
	"frond" : {
		type: "strip",
		pts: [[213, 430], [284, 429], [237, 348], [300, 375], [285, 296], [323, 337], [343, 288], [364, 305], [397, 290]],
        ox : 0, oy : -0.02,
	    scale : 1.5, olscale : 0.08,
	    num : 100,
	    col : '#911d1d', olcol : '#521010'
	},
	"hill" : {
		type: "strip",
		pts: [[213, 430], [284, 429], [237, 348], [300, 375], [285, 296], [323, 337], [343, 288], [364, 305], [397, 290]],
        ox : 0, oy : -0.02,
	    scale : 0.6, olscale : 0.08,
	    num : 100,
	    col : '#8CC662', olcol : '#521010'
	},
	"grass" : {
		type: "fan",
		pts: [[333,410], [417,376], [335,398], [323,308], [325,394], [278,334], [313,398], [261,398]],
        ox : 0, oy : -0.02,
	    scale : 1.2, olscale : 0.08,
	    num : 1002,
	    col : '#8CC662', olcol : '#521010'
	},
  "grass2" : {
    type: "strip",
    pts: [[213, 430], [284, 429], [237, 348], [300, 375], [285, 296], [323, 337], [343, 288], [364, 305], [397, 290]],
        ox : 0, oy : -0.02,
      scale : 0.6, olscale : 0.08,
      num : 1001,
      col : '#8CC662', olcol : '#521010'
  },
  "cloud" : {
    type: "fan",
    pts: [[286,403],[469,408],[447,364],[408,338],[358,310],[327,311],[298,323],[261,338],[216,344],[170,335],[137,341],[110,360],
      [96,394],[96,407],[280,396],[467,428],[483,384],[481,347],[461,315],[429,279],[417,246],[406,209],[379,183],[341,171],
      [280,188],[258,229],[221,275],[183,303],[139,330],[124,377],[127,427],[320,414],[480,421],[466,385],[448,345],[415,311],
      [364,294],[289,289],[220,298],[173,323],[149,368],[138,407],[137,428]],
    ox: 0, oy: -.3,
    scale:3.0, olscale: 0.05,
    num: 50,
    col: '#ffffff', olcol: '#9be0fc'
  }
};
var graftals = {};
var sample_textures = {};

var camera = {
			  position: [0,.5,5],
			  yaw: 0,
			  pitch: 0,
			  view_matrix: mat4.create(),
			  update: function() {
			  	mat4.identity(this.view_matrix);
			  	var p = this.position;
			  	mat4.rotate(this.view_matrix, -this.pitch,[1,0,0]);
			  	mat4.rotate(this.view_matrix, this.yaw,[0,1,0]);
			  	mat4.translate(this.view_matrix, [-p[0], -p[1], -p[2]]);
			  },
			  apply: function(){ mat4.multiply(this.view_matrix, NPR.mvMatrix, NPR.mvMatrix); }
			  };
var moving = {f : false, b : false, l : false, r : false};
var pmousex=0, pmousey=0;

var maincanvas;

function truffula_init() {	
	maincanvas = document.getElementById("main_canvas");
	maincanvas.width = document.width;  maincanvas.height = document.height;
	maincanvas.style.width = document.width + "px";
	maincanvas.style.height = document.height + "px";
	NPR.start(maincanvas);
	var gl = NPR.gl;

	models["sphere"] = new NPR.Mesh();
	models["sphere"].load("../../model/sphere_model.json.js", function() {models["sphere"].makeBuffers(); sampleLoadedModel("sphere", 100); sampleLoadedModel("sphere", 50);});

	models["hill"] = new NPR.Mesh();
	models["hill"].load("../../model/hill.json.js", function() {models["hill"].makeBuffers(); sampleLoadedModel("hill", 100); });

	models["plane"] = new NPR.Mesh();
	models["plane"].load("../../model/plane.json.js", function() {models["plane"].makeBuffers(); sampleLoadedModel("plane", 1000);sampleLoadedModel("plane", 1001);sampleLoadedModel("plane", 1002); });

	models["trunk"] = new NPR.Mesh();
	models["trunk"].load("../../model/trunk.json.js", function() {models["trunk"].makeBuffers();});


	shaders["flat"] = new NPR.ColorShader();
	shaders["graftal"] = new NPR.GraftalShader();
  shaders["outline"] = new NPR.FacingRatioOutlineShader();

	initGraftals();

	//
	// Input event handlers.
	//
	document.onmousemove = function(e) {     
	  var p = getMousePos(maincanvas, e);      
	  var mcw = parseInt(maincanvas.style.width);	  
	  var mch = parseInt(maincanvas.style.height);
	  var nx = (e.x - mcw/2)/(mcw/2);
	  var ny = -(e.y - mch/2)/(mch/2);
    camera.yaw = nx * Math.PI/2;
	  camera.pitch = ny * Math.PI/2;
    }
    document.onkeydown = function(e) {
    	switch (e.keyCode) {
    		case 87:  // W
    		  moving.f = true;
    		  break; 
    		case 65:  // A
    		  moving.l = true;
    		  break;
    		case 83:  // S
    		  moving.b = true;
    		  break; 
    		case 68:  // D
    		  moving.r = true;
    		  break; 		
    		default:
    		  break;
    	}
    }
    document.onkeyup = function(e) {
    	switch (e.keyCode) {
    		case 87:  // W
    		  moving.f = false;
    		  break; 
    		case 65:  // A
    		  moving.l = false;
    		  break;
    		case 83:  // S
    		  moving.b = false;
    		  break; 
    		case 68:  // D
    		  moving.r = false;
    		  break; 		
    		default:
    		  break;
    	}
    }
}

function update() {
  NPR.update();
  // Move the camera.
  var v = [0,0];  // x,z
  var sy = Math.sin(camera.yaw);
  var cy = Math.cos(camera.yaw);
  if (moving.f) { v[0] += sy;  v[1] -= cy; }
  if (moving.b) { v[0] -= sy;  v[1] += cy; }
  if (moving.r) { v[0] += cy;  v[1] += sy; }
  if (moving.l) { v[0] -= cy;  v[1] -= sy; }
  var new_pos = [camera.position[0], camera.position[2]];
  new_pos[0] += 0.1 * v[0];
  new_pos[1] += 0.1 * v[1];
  if (Math.sqrt(new_pos[0]*new_pos[0]+new_pos[1]*new_pos[1]) < 50) {
    camera.position[0] = new_pos[0];
    camera.position[2] = new_pos[1];
  }
  camera.update();
}

function draw() {
  if (!models['sphere']['VertexPositionBuffer'] || !models['trunk']['VertexPositionBuffer'] || !models['plane']['VertexPositionBuffer'] || !models['hill']['VertexPositionBuffer']) return;
	var gl = NPR.gl;
	gl.enable(gl.DEPTH_TEST);
	gl.clearColor(68/255, 205/255, 249/255,1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.viewport(0,0,gl.viewportWidth, gl.viewportHeight);
  NPR.pMatrix = mat4.perspective(45, gl.viewportWidth/gl.viewportHeight, 0.01, 100, NPR.pMatrix);
  mat4.identity(NPR.mvMatrix);
  NPR.mvPushMatrix();
  // Draw the ground.
  camera.apply();
  drawGraftal("plane", "grass", "plane_1000");
  drawGraftal("plane", "grass2", "plane_1001");
  drawGraftal("plane", "grass", "plane_1002");
  NPR.mvPopMatrix();
  NPR.mvPushMatrix();
    mat4.translate(NPR.mvMatrix, [-3,10,-15]);
    NPR.mvPushMatrix();
    camera.apply();
    drawGraftal("sphere", "cloud", "sphere_50");
    NPR.mvPopMatrix();
    mat4.translate(NPR.mvMatrix, [2,0,0]);
    NPR.mvPushMatrix();
    camera.apply();
    drawGraftal("sphere", "cloud", "sphere_50");
    NPR.mvPopMatrix();
  NPR.mvPopMatrix();
  // Trees.
  drawTree(0,-5);
  drawTree(3,-15, [.92,.117,.408], [111/255,4/255,31/255]);
  drawTree(-10,-5, [187/255,145/255,181/255]);
  drawTree(10,-7, [1, 188/255, 55/255]);
}

// Helper function to draw the tuft, trunk, and hill.
function drawTree(x,z,c1,c2) {
  NPR.mvPushMatrix();
  NPR.mvPushMatrix();
  mat4.translate(NPR.mvMatrix, [x,4,z]);
  mat4.rotate(NPR.mvMatrix, Math.PI/2, [1,0,0]);
  camera.apply();
  drawGraftal("sphere", "frond", "sphere_100", c1, c2);

  NPR.mvPopMatrix();
  mat4.translate(NPR.mvMatrix, [x,0,z]);
  camera.apply();
  drawGraftal("hill", "hill", "hill_100");
  
  shaders["outline"].bind();
  var nMatrix = mat3.create();
  mat4.toInverseMat3(NPR.mvMatrix, nMatrix);
  nMatrix = mat3.transpose(nMatrix);
  shaders["outline"].setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix, nMatrix);
  shaders["outline"].setUniforms({"uColor" : [251/255, 249/255, 114/255],
                                  "uOutlineColor:": [0,0,0]});
  shaders["outline"].drawModel(models["trunk"]);
  NPR.mvPopMatrix();
}

// Assuming the matrices are correct, draws the model as a graftal in 3 passes - 
// flat color, graftal fill, graftal outline.
function drawGraftal(model_name, graftal_name, sample_tex_name, override_color, override_outline_color) {
	var gl = NPR.gl;
	var model = models[model_name];
	var attrtex = sample_textures[sample_tex_name];
	var graftal = graftals[graftal_name];
	var col = override_color ? override_color : graftal.color;
  var ocol = override_outline_color ? override_outline_color : graftal.outline_color;

	shaders["flat"].bind();
	shaders["flat"].setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix);
	shaders["flat"].setUniforms({"uColor" : [col[0], col[1], col[2], 1]});
	shaders["flat"].drawModel(model);

	shaders["graftal"].bind();
	var nMatrix = mat3.create();
  	mat4.toInverseMat3(NPR.mvMatrix, nMatrix);
  	nMatrix = mat3.transpose(nMatrix);
  	shaders["graftal"].setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix, nMatrix);
  	gl.activeTexture(gl.TEXTURE0);
  	gl.bindTexture(gl.TEXTURE_2D, attrtex);
  	shaders["graftal"].setUniforms({"uInstanceAttrTex" : 0,
  									"uAttrTexDim"      : attrtex.dim,
  								    "uColor"		   : col,
  									"uFadeColor"       : col,
  								    "uOffset"		   : [graftal.offset_x, graftal.offset_y, 0],
  								    "uScale"           : graftal.scale});
  	shaders["graftal"].drawModel(graftal.vbo, gl.TRIANGLES);
  	shaders["graftal"].setUniforms({"uColor"		   : ocol});
  	shaders["graftal"].drawModel(graftal.outline_vbo, gl.TRIANGLES);
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


// Makes a set of graftal buffers from each template.
// Populates the 'graftals' map from the 'graftal_templates' map.
function initGraftals() {
  for (tem in graftal_templates) {
  	console.log("Making graftal '" + tem +"'");
  	graftals[tem] = makeGraftalFromTemplate(tem);
  }
}

// Populates the 'sample_textures' for a given model and number of samples.
// Inserts the created texture into the map with an index of "modelname_samplenumber"
// i.e. "sphere_1000"
function sampleLoadedModel(model_name, num_samples) {
  var key = model_name + "_" + num_samples;
  console.log("Creating attribute texture '" + key + "'");
  sample_textures[key] = makeSampleTexture(model_name, num_samples);
}

//
// Randomly sample num_samples points from a model (with normals),
// and make an attribute texture that contains this information.
//
function makeSampleTexture(model_name, num_samples) {
  var model = models[model_name];  
  var sampcontainer = {};
  var sampvecs = [];
  var nsampvecs = [];
  model.makeRandomSampleBuffers(num_samples, sampcontainer);
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
  return NPR.MakeAttributeTexture([sampvecs, nsampvecs]);
}

//
// Given a graftal template, create the corresponding buffers.
//
function makeGraftalFromTemplate(graftal_name) {
	function hexToRgb(hex) {
          var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : null;
        }        
	var template = graftal_templates[graftal_name];
	var g = {};

	// Copy over parameters.
	g.scale = template.scale;
	g.outline_scale = template.olscale;
	g.num_graftals = template.num;
	g.offset_x = template.ox;
	g.offset_y = template.oy;
	var c = hexToRgb(template.col);
	var oc = hexToRgb(template.olcol);
	g.color = [c.r/255, c.g/255, c.b/255];
	console.log("color: ")
	console.log(g.color);
	g.outline_color = [oc.r/255, oc.g/255, oc.b/255];

	// Polygon stuff.
	var poly;
	switch (template.type) {
        	case 'strip':
        	poly = new NPR.TriStrip(maincanvas);
        	break;
        	case 'fan':
        	poly = new NPR.TriFan(maincanvas);
        	break;
        	case 'tris':
        	poly = new NPR.Triangles(maincanvas);
        	break;
    }
    for (var i = 0; i < template.pts.length; i++) {
        	poly.addPoint(template.pts[i][0], template.pts[i][1]);
    }

    // Build buffer.
    g.vbo = poly.makeInstancedVertexBuffer(NPR.gl, g.num_graftals);
    var ol = poly.makeOutlinePolygon(g.outline_scale, true);
    g.outline_vbo = ol.makeInstancedVertexBuffer(NPR.gl, g.num_graftals, ol.getFlattenedTriangles());
    return g;
}