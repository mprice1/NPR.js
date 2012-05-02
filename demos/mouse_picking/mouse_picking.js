// Javascript Document.
var maincanvas;
var pickcanvas; var pctx;
var texcanvas; var tctx;

var mousex, mousey;

var tex;
var shdr;  var texshdr;
var mousedown;
var sphere;
var brush;

var pbrushpos = [];
var brushpos = [];

function mouse_picking_init() {
	pickcanvas = document.createElement("canvas");
	pickcanvas.width = 1; pickcanvas.height = 1;
	pctx = pickcanvas.getContext("2d");

	maincanvas = document.getElementById("main_canvas");
	NPR.start(maincanvas);
	var gl = NPR.gl;
	gl.enable(gl.DEPTH_TEST);

	texcanvas = document.getElementById("tex_canvas");
	tctx = texcanvas.getContext("2d");
	tctx.fillStyle = "red";
	tctx.fillRect(0,0,512,512);

	// Make texture from canvas.
	tex = NPR.canvasTexture(texcanvas);

	brush = new NPR.Brush(tctx, NPR.makeBrushImage(32, 0.1, [0,0,0,.7]));

	//
	// Texture Coordinate Shader.
	//

	var vert_src = "\
	  uniform mat4 uMVMatrix;\
	  uniform mat4 uPMatrix;\
	  \
	  attribute vec3 aVertexPosition;\
	  attribute vec2 aTextureCoordinate;\
	  \
	  varying vec2 vTexCoord;\
	  void main(void) {\
	  	vTexCoord = aTextureCoordinate;\
	  	gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
	  }\
	"
	var frag_src = "\
	precision mediump float;\
	\
	varying vec2 vTexCoord;\
	void main(void) {\
	  gl_FragColor = vec4(vTexCoord.x,vTexCoord.y,0.0,1.0);\
	}\
	"
	shdr = new NPR.Shader(vert_src, frag_src);
	shdr.attributes = {"VertexPositionBuffer"    : gl.getAttribLocation(shdr.program, "aVertexPosition"),
					   "TextureCoordinateBuffer" : gl.getAttribLocation(shdr.program, "aTextureCoordinate")};

  //
  //  Object Space Position Shader.
  //

  var vert_src = "\
    uniform mat4 uMVMatrix;\
    uniform mat4 uPMatrix;\
    \
    attribute vec3 aVertexPosition;\
    \
    varying vec3 vPosition;\
    void main(void) {\
      vPosition = aVertexPosition;\
      gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
    }\
  "
  var frag_src = "\
  precision mediump float;\
  \
  uniform vec3 uDmin;\
  uniform vec3 uDmax;\
  \
  varying vec3 vPosition;\
  void main(void) {\
    gl_FragColor.xyz = (vPosition.xyz - uDmin) / (uDmax-uDmin);\
    gl_FragColor.a = 1.0;\
  }\
  "

  posshdr = new NPR.Shader(vert_src, frag_src);
  posshdr.attributes = {"VertexPositionBuffer" : gl.getAttribLocation(posshdr.program, "aVertexPosition")};
  posshdr.setUniforms({"uDmin" : [-.5, -.5, -.5],
                       "uDmax" : [ .5,  .5,  .5]});

  //
	// Flat Texture Shader.
	//

	vert_src = "\
	uniform mat4 uMVMatrix;\
	uniform mat4 uPMatrix;\
	\
    attribute vec3 aVertexPosition;\
    attribute vec2 aTexureCoordinate;\
    varying vec2 vTexCoord;\
    void main(void) {\
      vTexCoord = aTexureCoordinate;\
      gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
    }\
    "

    frag_src = "\
    #ifdef GL_ES\n\
      precision highp float;\n\
    #endif\n\
    uniform sampler2D uTextureSampler;\
    varying vec2 vTexCoord;\
    void main(void) {\
      vec4 texcol  = texture2D(uTextureSampler, vTexCoord);\
      gl_FragColor = texcol;\
    }\
    "

    texshdr = new NPR.Shader(vert_src, frag_src);
	texshdr.attributes = {"VertexPositionBuffer"    : gl.getAttribLocation(shdr.program, "aVertexPosition"),
					   "TextureCoordinateBuffer" : gl.getAttribLocation(shdr.program, "aTextureCoordinate")};

	//
	//  Sphere geometry.
	//
	sphere = createSphere(5,5);


	//
	// Mouse events.
	//
	maincanvas.onmousedown = function(e) {
      mousedown = true;
      var p = getMousePos(maincanvas, e);
      mousex = p.x;
      mousey = p.y;
    }
    document.onmouseup = function(e) {
      mousedown = false;
    }
    document.onmousemove = function(e) { 
	    var p = getMousePos(maincanvas, e);
	    mousex = p.x;
        mousey = p.y;

    }
    maincanvas.onclick = function(e) {
	  var p = getMousePos(maincanvas, e);
    }
    document.onkeydown = function(e) {
    	switch (e.keyCode) {
    		default:
    		  break;
    	}
    }
}

// Draws on the texture map and
// reuploads it to the GPU.
function paintTexture() {
	var gl = NPR.gl;
  // console.log("drawing from ("+pbrushpos[0]+","+pbrushpos[1]+") to ("+brushpos[0]+","+brushpos[1]+")");
	brush.DrawLine(pbrushpos[0], pbrushpos[1], brushpos[0], brushpos[1]);
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texcanvas);
	gl.generateMipmap(gl.TEXTURE_2D);
}

function update() {
  NPR.update();
}

function draw() {
  var gl = NPR.gl;
  gl.viewport(0,0,gl.viewportWidth, gl.viewportHeight);
  NPR.pMatrix = mat4.perspective(45, gl.viewportWidth/gl.viewportHeight, 0.01, 100, NPR.pMatrix);
  shdr.bind();

  NPR.mvPushMatrix();
  	mat4.translate(NPR.mvMatrix, [0,0,-5]);
  	mat4.rotate(NPR.mvMatrix, NPR.frame/100.0, [1,1,0]);
  	shdr.setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix);
    shdr.drawModel(sphere);

  pctx.clearRect(0,0,512,512);
  pctx.drawImage(maincanvas, mousex, mousey, 1,1, 0, 0, 1,1);
  // Get tex coords from image:
  var idata = pctx.getImageData(0,0,1,1);
  var pix = idata.data;
  pbrushpos = brushpos.slice(0);
  brushpos[0] = pix[0]/255 * 512;
  brushpos[1] = 512 - (pix[1]/255 * 512);

  if (mousedown) {
    paintTexture();
  }



  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  texshdr.setUniforms({"uTextureSampler" : 0});
  texshdr.setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix);
  texshdr.drawModel(sphere);

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


