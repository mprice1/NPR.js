// Javascript Document.
var canvas3d;
var mousedown;
var model;

// Shader declarations.
var shdr;
var shader3d;
var painterly_shader;
// Render passes.
var depth_pass;
var painterly_pass;
var color_fb;
// Textures.
var lapped_mask_tex;
var tamtex1;
var tamtex2;
var billboard_attr_tex;

var billboard_buffers;

var curmodel = 'sphere';
var models = {
	'sphere' : null,
	'blob' : '../../model/blob.json.js'
}

var num_strokes = 100;
var scale = [1,1];
var usemip = true;
var lightdir = [0,1,1];

function hatch_init() {
	//
	// DAT GUI initialization.
	//
	props = {     "scale X" : 1.0,
				  "scale Y" : 1.0,
				  "number" : 100,
				  "color" : [255, 255, 255],
				  "model" : "sphere",
				  "lightdirx" : 0, "lightdiry" : 1, "lightdirz" : 1,
				  "rebuild" : function() { rebuild();},
				  "usemip" : true };
	var gui = new dat.GUI();
	gui.add(props, 'scale X', 0, 5).onChange(function(val){ scale[0] = val; } );
	gui.add(props, 'scale Y', 0, 5).onChange(function(val){ scale[1] = val; } );
	gui.add(props, "lightdirx", -1, 1).onChange(function(val) { lightdir[0] = val; });
	gui.add(props, "lightdiry", -1, 1).onChange(function(val) { lightdir[1] = val; });
	gui.add(props, "lightdirz", -1, 1).onChange(function(val) { lightdir[2] = val; });
	gui.add(props, 'model', { Sphere: "sphere", Blob: "blob" } ).onChange(function(val) { changeModel(val); });
	gui.add(props, 'number', 10, 10000).onChange(function(val){ num_strokes = val;} );
	gui.add(props, 'usemip').onChange(function(val){ usemip = val; } );
	gui.add(props, 'rebuild');

	// Resamples the sphere.
	// Deletes the old ones.
	function rebuild() {
		var gl = NPR.gl;
		gl.deleteBuffer(model.RandomSampleBuffer);
		if(billboard_buffers) {
		  gl.deleteBuffer(billboard_buffers['VertexPositionBuffer']);
		  gl.deleteBuffer(billboard_buffers['InstanceIDBuffer']);
	 	  gl.deleteTexture(billboard_attr_tex);
	    }

		if (curmodel == 'sphere') {
		  var sampcontainer = {};
		  var sampvecs = [];
		  makeSphereSampleBuffer(num_strokes, model, sampcontainer);
		  model.RandomSampleNormalBuffer = model.RandomSampleBuffer;
		  for (var i =0; i < sampcontainer.samples.length; i+=3) {
		  var vec = [];
		    vec[0] = sampcontainer.samples[i];
		    vec[1] = sampcontainer.samples[i+1];
	        vec[2] = sampcontainer.samples[i+2];
    	    sampvecs[i/3] = vec;
	      }
	      billboard_attr_tex = NPR.MakeAttributeTexture([sampvecs, sampvecs]);
	    } else {
	      var sampcontainer = [];
	      var sampvecs = [];
	      var nsampvecs = [];
	      model.makeRandomSampleBuffers(num_strokes, sampcontainer);
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
	      billboard_attr_tex = NPR.MakeAttributeTexture([sampvecs, nsampvecs]);
	    } 
	    billboard_buffers = NPR.createInstancedBillboardBuffers(NPR.gl, num_strokes);
	}

    function changeModel(name) {
		curmodel = name;
		if (curmodel=='sphere') {
			model = createSphere(10, 10);
			rebuild();
		} else {
			model = new NPR.Mesh();
			model.load(models[name], function() { model.makeBuffers(); rebuild(); });
		}
	}

	//
	// Real initialization.
	//
	canvas3d = document.getElementById("main_canvas");
	NPR.start(canvas3d);
	var gl = NPR.gl;

	model = createSphere(10, 10);
	rebuild();

	tamtex1 = NPR.loadCustomMipmap(["../../images/TAM_0_3.png"]);
	tamtex2 = NPR.loadCustomMipmap(["../../images/TAM_1_3.png"]);
	miptamtex1 = NPR.loadCustomMipmap(["../../images/TAM_0_3.png",
									"../../images/TAM_0_2.png",
									"../../images/TAM_0_1.png",
									"../../images/TAM_0_0.png"]);
	miptamtex2 = NPR.loadCustomMipmap(["../../images/TAM_1_3.png",
									"../../images/TAM_1_2.png",
									"../../images/TAM_1_1.png",
									"../../images/TAM_1_0.png"]);
	lapped_mask_tex = NPR.loadTexture("../../images/hatchmask.png");


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
	// Simple flat color shader for 3d stuff.
	//
	vert_src = "\
	  uniform mat4 uMVMatrix;\
	  uniform mat4 uPMatrix;\
	  \
	  attribute vec3 aVertexPosition;\
	  varying vec3 vPosition;\
	  varying float vLightIntensity;\
	  void main(void) {\
	  	vPosition = aVertexPosition;\
	  	vLightIntensity = dot(normalize(uMVMatrix*vec4(aVertexPosition,0.0)), normalize(vec4(0,1,1,0)));\
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
	varying float vLightIntensity;\
	void main(void) {\
	  gl_FragColor = vec4(uColor*vLightIntensity,1.0);\
	}\
	"
	shader3d = new NPR.Shader(vert_src, frag_src);
	shader3d.attributes = {"VertexPositionBuffer" : gl.getAttribLocation(shader3d.program, "aVertexPosition")};

	hatch_shader = new NPR.HatchBillboardShader();

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
  var gl = NPR.gl;
  gl.clear(gl.COLOR_BUFFER_BIT, gl.DEPTH_BUFFER_BIT);
  gl.viewport(0,0,gl.viewportWidth, gl.viewportHeight);
  NPR.pMatrix = mat4.perspective(45, gl.viewportWidth/gl.viewportHeight, 0.01, 100, NPR.pMatrix);
  gl.disable(gl.DEPTH_TEST);

  // Draw the strokes.
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, usemip ? miptamtex1 : tamtex1);
  gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, usemip ? miptamtex2 : tamtex2);
  gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, lapped_mask_tex);
  gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, billboard_attr_tex);
  hatch_shader.setUniforms({      "uTamTex1"    : 0,
  								  "uTamTex2"    : 1,
  								  "uLappedMask"    : 2,
  								  "uInstanceAttrTex" : 3,
  								  "uAttrTexDim"      : billboard_attr_tex.dim,
  								  "uScale"           : scale,
  								  "uLightDir" : lightdir
  								  });

  NPR.mvPushMatrix();
  	mat4.identity(NPR.mvMatrix);
  	mat4.translate(NPR.mvMatrix, [0,0,-5]);
  	mat4.rotate(NPR.mvMatrix, NPR.frame/50.0, [1,1,0]);    
    var nMatrix = mat3.create();  nMatrix = mat3.transpose(mat4.toInverseMat3(NPR.mvMatrix, nMatrix));
  	hatch_shader.setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix, nMatrix);
  	hatch_shader.drawModel(billboard_buffers, gl.TRIANGLES);
  NPR.mvPopMatrix();
}

// This is the draw call that can be overridden (i.e. for a RenderPass).
function drawSphere(shader) {
  var gl = NPR.gl;
  gl.viewport(0,0,gl.viewportWidth, gl.viewportHeight);
  NPR.pMatrix = mat4.perspective(45, gl.viewportWidth/gl.viewportHeight, 0.01, 100, NPR.pMatrix);
  shader.bind();
  NPR.mvPushMatrix();
  	mat4.identity(NPR.mvMatrix);
  	mat4.translate(NPR.mvMatrix, [0,0,-5]);
  	mat4.rotate(NPR.mvMatrix, NPR.frame/50.0, [1,1,0]);
  	var nMatrix = mat3.create();  nMatrix = mat3.transpose(mat4.toInverseMat3(NPR.mvMatrix, nMatrix));
  	shader.setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix, nMatrix);
  	shader.drawModel(model);
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



