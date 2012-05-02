// Javascript Document.
var maincanvas; var ctx;
var canvas3d; var ctx3d;
var shdr;
var is_3d = false;
var polybuffer;
var mousedown;
var polygon;
var polytype = 0;
function poly2d_init() {
	maincanvas = document.getElementById("main_canvas");
	ctx = maincanvas.getContext("2d");
	polygon = new NPR.Triangles(maincanvas);

	canvas3d = document.createElement("canvas");
	canvas3d.width = 512;  canvas3d.height = 512;
	NPR.start(canvas3d);
	var gl = NPR.gl;

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
		polybuffer = polygon.makeVertexBuffer(NPR.gl);
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
  if (!is_3d) return;
  var gl = NPR.gl;
  gl.viewport(0,0,gl.viewportWidth, gl.viewportHeight);
  NPR.pMatrix = mat4.perspective(45, gl.viewportWidth/gl.viewportHeight, 0.01, 100, NPR.pMatrix);
  gl.useProgram(shdr.program);
  NPR.mvPushMatrix();
    
  	mat4.translate(NPR.mvMatrix, [0,0,-5]);
  	mat4.rotate(NPR.mvMatrix, NPR.frame/50.0, [1,1,0]);
  	shdr.setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix);
  NPR.mvPopMatrix();
  gl.bindBuffer(gl.ARRAY_BUFFER, polybuffer);
    gl.vertexAttribPointer(shdr.attributes["VertexPositionBuffer"], polybuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shdr.attributes["VertexPositionBuffer"]);
	switch (polygon.polyType) {
		case NPR.Polygon.prototype.TRIANGLES:
			gl.drawArrays(gl.TRIANGLES, 0, polybuffer.numItems);
			break;
		case NPR.Polygon.prototype.TRIANGLE_FAN:
			gl.drawArrays(gl.TRIANGLE_FAN, 0, polybuffer.numItems);
			break;
		case NPR.Polygon.prototype.TRIANGLE_STRIP:
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, polybuffer.numItems);
			break;
	}
    
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
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



