var NPR = NPR || {};

var models = {};
var shaders = {};
var sample_textures = {};
var textures = {};
var billboard_buffers = {};
var fbos = {};

var camera = {
			  position: [0,1,0],
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

function painted_init() {	
	maincanvas = document.getElementById("main_canvas");
	maincanvas.width = window.screen.width/2;  maincanvas.height = window.screen.height/2;
	maincanvas.style.width = window.screen.width + "px";
	maincanvas.style.height = window.screen.height + "px";
	NPR.start(maincanvas);
	var gl = NPR.gl;

	models["sphere"] = new NPR.Mesh();
	models["sphere"].load("../../model/sphere_model.json.js", function() { models["sphere"].makeBuffers(); sampleLoadedModel("sphere", 1000); });
  models["trunk"] = new NPR.Mesh();
  models["trunk"].load("../../model/trunk.json.js", function() { models["trunk"].makeBuffers(); sampleLoadedModel("trunk", 500);});
  models["hill"] = new NPR.Mesh();
  models["hill"].load("../../model/hill.json.js", function() {models["hill"].makeBuffers(); sampleLoadedModel("hill", 200); });
  models["plane"] = new NPR.Mesh();
  models["plane"].load("../../model/pdisk.json.js", function() {models["plane"].makeBuffers(); sampleLoadedModel("plane", 1000);});

  //makeBillboardBuffer(10000);
  makeBillboardBuffer(1000);
  makeBillboardBuffer(500);
  makeBillboardBuffer(200);

	shaders["flat"] = new NPR.ColorShader();
  shaders["light"] = new NPR.ColorLightDirShader();
  shaders["light"].setUniforms({"uLightDir": [1,1,1]});
  shaders["paint"] = new NPR.PainterlyBillboardShader();

  textures["brush"] = NPR.loadTexture("../../images/dots.png");

  fbos["color"] = new NPR.Framebuffer();

  fbos["blurrycolor"] = new NPR.Framebuffer({"width":gl.viewportWidth/10, "height":gl.viewportHeight/10,
                                      "type":gl.UNSIGNED_BYTE, "channelFormat":gl.RGBA, "hasDepth":true});
  fbos["depth"] = new NPR.Framebuffer();

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
  camera.position[0] += 0.1 * v[0];
  camera.position[2] += 0.1 * v[1];
  camera.update();
}

function draw() {
	var gl = NPR.gl;
  gl.enable(gl.DEPTH_TEST);	
	gl.viewport(0,0,gl.viewportWidth, gl.viewportHeight);
  NPR.pMatrix = mat4.perspective(45, gl.viewportWidth/gl.viewportHeight, 0.01, 100, NPR.pMatrix);
  mat4.identity(NPR.mvMatrix);
  shaders["light"].bind();

    fbos['color'].bind();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Draw the sphere.
    mat4.translate(NPR.mvMatrix, [0,-5,-5]);
    NPR.mvPushMatrix();
    mat4.translate(NPR.mvMatrix, [0,4,0]);
    var nMatrix = mat3.create();
    mat4.toInverseMat3(NPR.mvMatrix, nMatrix);
    nMatrix = mat3.transpose(nMatrix);
    camera.apply();
    shaders["light"].setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix, nMatrix);
    shaders["light"].setUniforms({"uColor" : [1,0,.5]});
  	shaders["light"].drawModel(models["sphere"]);
    NPR.mvPopMatrix();

    // Draw the trunk.
    NPR.mvPushMatrix();
    var nMatrix = mat3.create();
    mat4.toInverseMat3(NPR.mvMatrix, nMatrix);
    nMatrix = mat3.transpose(nMatrix);
    camera.apply();
    shaders["light"].setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix, nMatrix);
    shaders["light"].setUniforms({"uColor" : [.8,.8,.2]});
    shaders["light"].drawModel(models["trunk"]);
    NPR.mvPopMatrix();

    // Draw the hill.
    NPR.mvPushMatrix();
    var nMatrix = mat3.create();
    mat4.toInverseMat3(NPR.mvMatrix, nMatrix);
    nMatrix = mat3.transpose(nMatrix);
    camera.apply();
    shaders["light"].setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix, nMatrix);
    shaders["light"].setUniforms({"uColor" : [.2,.8,.2]});
    shaders["light"].drawModel(models["hill"]);
    NPR.mvPopMatrix();

    // Draw the ground.
    NPR.mvPushMatrix();
    var nMatrix = mat3.create();
    mat4.toInverseMat3(NPR.mvMatrix, nMatrix);
    nMatrix = mat3.transpose(nMatrix);
    camera.apply();
    shaders["light"].setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix, nMatrix);
    shaders["light"].setUniforms({"uColor" : [.2,.8,.2]});
    shaders["light"].drawModel(models["plane"]);
    NPR.mvPopMatrix();

    fbos['color'].release();
    fbos['blurrycolor'].bind();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    NPR.DrawTexture(fbos['color'].texture);
    fbos['blurrycolor'].release();
   // gl.viewport(0,0,gl.viewportWidth, gl.viewportHeight);
    //
    // PAINTERLY PASS
    //

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    NPR.DrawTexture(fbos['blurrycolor'].texture);
    NPR.DrawTexture(fbos['color'].texture, true);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Draw the ground.
    NPR.mvPushMatrix();
    camera.apply();
    var nMatrix = mat3.create();
    mat4.toInverseMat3(NPR.mvMatrix, nMatrix);
    nMatrix = mat3.transpose(nMatrix);
    shaders["paint"].setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix, nMatrix);
    drawPaintedModel("plane", 1000);
    NPR.mvPopMatrix();

    // Draw the hill.
    NPR.mvPushMatrix();
    camera.apply();
    var nMatrix = mat3.create();
    mat4.toInverseMat3(NPR.mvMatrix, nMatrix);
    nMatrix = mat3.transpose(nMatrix);
    shaders["paint"].setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix, nMatrix);
    drawPaintedModel("hill", 200);
    NPR.mvPopMatrix(); 

    // Draw the sphere.
    NPR.mvPushMatrix();
    mat4.translate(NPR.mvMatrix, [0,4,0]);
    camera.apply();
    var nMatrix = mat3.create();
    mat4.toInverseMat3(NPR.mvMatrix, nMatrix);
    nMatrix = mat3.transpose(nMatrix);
    shaders["paint"].setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix, nMatrix);
    drawPaintedModel("sphere", 1000);
    NPR.mvPopMatrix();

    // Draw the trunk.
    NPR.mvPushMatrix();
    camera.apply();
    var nMatrix = mat3.create();
    mat4.toInverseMat3(NPR.mvMatrix, nMatrix);
    nMatrix = mat3.transpose(nMatrix);
    shaders["paint"].setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix, nMatrix);
    drawPaintedModel("trunk", 500);
    NPR.mvPopMatrix();

       

}

function drawPaintedModel(model_name, num_samples) {
  var gl = NPR.gl;
  var bb = billboard_buffers["bb_"+num_samples];
  var attrtex = sample_textures[model_name +"_"+ num_samples];
  // Bind Ye Olde textures
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textures["brush"]);
  gl.activeTexture(gl.TEXTURE1);
  fbos['color'].bindTexture();
  gl.activeTexture(gl.TEXTURE2);
  fbos['depth'].bindTexture();
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, attrtex);
  shaders["paint"].setUniforms({  
                    "uBrushTexture"    : 0,
                    "uColorTexture"    : 1,
                    "uDepthTexture"    : 2,
                    "uInstanceAttrTex" : 3,
                    "uAttrTexDim"      : attrtex.dim,
                    "uScale"           : [1,1]});
  shaders["paint"].drawModel(bb);
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

function makeBillboardBuffer(num_samples) {
  console.log("creating billboard buffer bb_" + num_samples); 
  billboard_buffers["bb_" + num_samples] = NPR.createInstancedBillboardBuffers(NPR.gl, num_samples);
}