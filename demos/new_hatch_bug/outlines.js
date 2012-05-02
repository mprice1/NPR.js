// Javascript Document.
var canvas3d;
var mousedown;
var sphere;

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

var num_strokes = 10000;
var scale = [1,1];
var usemip = true;

var first = 1;
function wtf() {
	if (first && sphere.loaded) {
		first--;
		rebuild();
	}
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

function hatch_init() {
	//
	// DAT GUI initialization.
	//
	props = {     "scale X" : 1.0,
				  "scale Y" : 1.0,
				  "number" : 100,
				  "color" : [255, 255, 255],
				  "rebuild" : rebuild,
				  "usemip" : true };
	var gui = new dat.GUI();
	gui.add(props, 'scale X', 0, 5).onChange(function(val){ scale[0] = val; } );
	gui.add(props, 'scale Y', 0, 5).onChange(function(val){ scale[1] = val; } );
	gui.add(props, 'number', 10, 10000).onChange(function(val){ num_strokes = val;} );
	gui.add(props, 'usemip').onChange(function(val){ usemip = val; } );
	gui.add(props, 'rebuild');

	//
	// Real initialization.
	//
	canvas3d = document.getElementById("main_canvas");
	NPR.start(canvas3d);
	var gl = NPR.gl;

	sphere = new NPR.Mesh();
	sphere.load("../../model/blob.json.js", function(){rebuild();});
	

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
	varying vec3 vNormal;\
	void main(void) {\
	  gl_FragColor = vec4(1.0,0,0,0.75);\
	}\
	"
	shader3d = new NPR.Shader(vert_src, frag_src);
	shader3d.attributes = {"VertexPositionBuffer" : gl.getAttribLocation(shader3d.program, "aVertexPosition"),
						   "VertexNormalBuffer" : gl.getAttribLocation(shader3d.program, "aVertexNormal")};

	//
	// 
	//

	vert_src = "\
 	  uniform float uYaw;\
 	  uniform float uPitch;\
	  \
	  uniform mat4 uMVMatrix;\
	  uniform mat4 uPMatrix;\
	  uniform mat3 uNMatrix;\
	  uniform float uAttrTexDim;\
	  uniform vec2 uScale;\
	  \
	  uniform sampler2D uLappedMask;\
	  uniform sampler2D uTamTex1;\
	  uniform sampler2D uTamTex2;\
	  uniform sampler2D uInstanceAttrTex;\
	  \
	  attribute vec2 aVertexPosition;\
	  attribute float aInstanceID;\
	  \
	  varying vec2 vTexCoord;\
	  varying float vFacingRatio;\
	  varying float vLightIntensity;\
	  varying vec3 vnorm;\
	  \
	  vec2 attrTexCell(float idx) {\
	  	  float r = floor(idx / uAttrTexDim);\
	  	  float c = mod(idx, uAttrTexDim);\
	  	  float drc = 0.5 / uAttrTexDim;\
	  	  vec2 attrTc = vec2(c/uAttrTexDim+drc, r/uAttrTexDim+drc);\
	  	  return attrTc;\
	  }\
	  \
	  void main(void) {\
	  	float pi = 3.14159265358;\
	  	vec2 attrTc = attrTexCell(aInstanceID*2.0);\
	  	vec4 instpos = texture2D(uInstanceAttrTex, attrTc);\
	  	vec3 instnorm = texture2D(uInstanceAttrTex, attrTexCell(aInstanceID*2.0 + 1.0)).xyz;\
	  	vec4 mvpos = uMVMatrix * instpos;\
	  	vec4 mvppos = uPMatrix * mvpos;\
	  	vec2 screen_coord = mvppos.xy / 2.0 / mvppos.w + vec2(0.5, 0.5);\
	  	vTexCoord = aVertexPosition;\
	  	\
	  	/* Project normal to the screen. */\
	  	vec4 p1 = mvppos;\
	  	vec4 p2 = instpos + vec4(instnorm.xyz, 1.0);\
	  	p2 = uPMatrix * uMVMatrix * p2;\
	  	vec3 projnorm = (p2 - p1).xyz;\
	  	float dz = -projnorm.z; projnorm.z=projnorm.y; projnorm.y=dz;\
	  	projnorm = normalize(projnorm);\
	    projnorm.z = 0.0;\
	  	projnorm = normalize(projnorm);\
	  	\
	    /* Facing Ratio */\
	  	vec3 mvn = normalize(uNMatrix * instnorm);\
	  	vnorm = mvn;\
	  	vFacingRatio = dot(mvn, vec3(0,0,1));\
	  	vLightIntensity = dot(mvn, normalize(vec3(0,1,1)));\
	  	\
        /* Build a rotation matrix so we don't billboard. */\
	  	vec3 ra = -cross(vec3(0,0,1.0), mvn);\
	  	float cA = dot(vec3(0,0,1.0), mvn);\
	  	float icA = 1.0 - cA;\
	  	float sA = sin(acos(cA));\
	  	mat3 rotMat;\
	  	float r00 = cA+ra.x*ra.x*icA;  float r01 = ra.x*ra.y*icA-ra.z*sA; float r02 = ra.x*ra.z*icA+ra.y*sA;\
	  	float r10 = ra.y*ra.x*icA+ra.z*sA;  float r11 = cA+ra.y*ra.y*icA;  float r12 = ra.y*ra.z*icA-ra.x*sA;\
	  	float r20 = ra.z*ra.x*icA-ra.y*sA;  float r21 = ra.z*ra.y*icA+ra.x*sA;  float r22 = cA+ra.z*ra.z*icA;\
        rotMat[0] = vec3(r00, r01, r02);\
	  	rotMat[1] = vec3(r10, r11, r12);\
	  	rotMat[2] = vec3(r20, r21, r22);\
	  	vec3 rmp = rotMat * vec3((aVertexPosition-vec2(.5,.5))*uScale, 0);\
	  	vec4 ppp = mvpos + vec4(rmp, 0);\
	  	\
	  	/* Rotation around screen normal. */\
	  	vec2 tpos = aVertexPosition - vec2(0.5, 0.5);\
	  	tpos = tpos * uScale;\
	  	float angle = atan(projnorm.y, projnorm.x) - pi/2.0;\
	  	float ox  = tpos.x;\
	  	tpos.x = tpos.x * cos(angle) - tpos.y * sin(angle);\
        tpos.y = ox * sin(angle) + tpos.y * cos(angle);\
	  	\
	  	gl_Position = mvppos;\
	  	gl_Position.xy = gl_Position.xy + tpos;\
	  	gl_Position = uPMatrix * ppp;\
	  }\
	";

	frag_src = "\
	precision mediump float;\
	\
    uniform sampler2D uLappedMask;\
	uniform sampler2D uTamTex1;\
	uniform sampler2D uTamTex2;\
	\
	varying float vFacingRatio;\
	varying vec2 vTexCoord;\
	varying float vLightIntensity;\
	varying vec3 vnorm;\
	\
	void main(void) {\
	  if (vFacingRatio < -0.0) discard;\
	  float fade = (vFacingRatio-0.25)/0.75;\
	  vec4 mask = texture2D(uLappedMask, vTexCoord);\
	  float hatchval = 0.0;\
	  vec4 hatchSamp1 = texture2D(uTamTex1, vTexCoord);\
	  vec4 hatchSamp2 = texture2D(uTamTex2, vTexCoord);\
	  if (vLightIntensity > 0.9) {\
	  	hatchval = mix(1.0, hatchSamp1.x, 1.0-(vLightIntensity - 0.9)/0.1);\
	  } else if (vLightIntensity > 0.8) {\
	  	float v1 = hatchSamp1.x;\
	    float v2 = hatchSamp1.y;\
	    hatchval = mix(v1, v2, 1.0-(vLightIntensity - 0.8)/0.2);\
	  } else if (vLightIntensity > 0.65) {\
	  	float v1 = hatchSamp1.y;\
	    float v2 = hatchSamp1.z;\
	  	hatchval = mix(v1, v2, 1.0-(vLightIntensity - 0.65)/0.15);\
	  } else if (vLightIntensity > 0.5) {\
	  	float v1 = hatchSamp1.z;\
	    float v2 = hatchSamp2.x;\
	  	hatchval = mix(v1, v2, 1.0-(vLightIntensity - 0.5)/0.15);\
	  } else if (vLightIntensity > 0.35) {\
	  	float v1 = hatchSamp2.x;\
	    float v2 = hatchSamp2.y;\
	  	hatchval = mix(v1, v2, 1.0-(vLightIntensity - 0.35)/0.15);\
	  } else if (vLightIntensity > 0.2) {\
	  	float v1 = hatchSamp2.y;\
	    float v2 = hatchSamp2.z;\
	  	hatchval = mix(v1, v2, 1.0-(vLightIntensity - 0.2)/0.15);\
	  } else {\
	  	hatchval = texture2D(uTamTex2, vTexCoord).z;\
	  }\
	  gl_FragColor.a = mask.r;\
	  if (mask.r < 0.01) discard;\
	  gl_FragColor.a = gl_FragColor.a * fade;\
      gl_FragColor.rgb = vec3(hatchval, hatchval, hatchval) * gl_FragColor.a;\
	}\
	";

	hatch_shader = new NPR.Shader(vert_src, frag_src);
	hatch_shader.attributes = {"VertexPositionBuffer" : gl.getAttribLocation(hatch_shader.program, "aVertexPosition"),
							   "InstanceIDBuffer"     : gl.getAttribLocation(hatch_shader.program, "aInstanceID")};

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
	if (!billboard_attr_tex) return;
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
  								  "uScale"           : scale
  								  });

  NPR.mvPushMatrix();
  	mat4.identity(NPR.mvMatrix);
  	mat4.translate(NPR.mvMatrix, [0,0,-5]);
  	mat4.rotate(NPR.mvMatrix, NPR.frame/50.0, [1,1,0]);    
    var nMatrix = mat3.create();  nMatrix = mat3.transpose(mat4.toInverseMat3(NPR.mvMatrix, nMatrix));
  	hatch_shader.setMatrixUniforms(NPR.mvMatrix, NPR.pMatrix, nMatrix); 
  	hatch_shader.drawModel(billboard_buffers, gl.TRIANGLES);
  NPR.mvPopMatrix();
  wtf();
}

// This is the draw call that can be overridden (i.e. for a RenderPass).
function drawSphere(shader, mode, buff) {
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
  	shader.drawModel(sphere, mode, buff);

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



