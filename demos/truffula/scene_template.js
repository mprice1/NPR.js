var NPR = NPR || {};

var models = {};
var shaders = {};

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

function truffula_init() {	
	maincanvas = document.getElementById("main_canvas");
	maincanvas.width = window.screen.width/2;  maincanvas.height = window.screen.height/2;
	maincanvas.style.width = window.screen.width + "px";
	maincanvas.style.height = window.screen.height + "px";
	NPR.start(maincanvas);
	var gl = NPR.gl;

	models["sphere"] = new NPR.Mesh();
	models["sphere"].load("../../model/sphere_model.json.js", function() {models["sphere"].makeBuffers();});

	shaders["flat"] = new NPR.ColorShader();

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
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.viewport(0,0,gl.viewportWidth, gl.viewportHeight);
    NPR.pMatrix = mat4.perspective(45, gl.viewportWidth/gl.viewportHeight, 0.01, 100, NPR.pMatrix);
    mat4.identity(NPR.mvMatrix);
    shaders["flat"].bind();
    mat4.translate(NPR.mvMatrix, [0,0,-5]);
  	mat4.rotate(NPR.mvMatrix, NPR.frame/150.0, [1,1,0]);
  	// Apply the view matrix.  	
  	camera.apply();
  	shaders["flat"].setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix);
  	shaders["flat"].setUniforms({"uColor" : [1,0,.5, 1.0]});
  	shaders["flat"].drawModel(models["sphere"], gl.LINES);

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