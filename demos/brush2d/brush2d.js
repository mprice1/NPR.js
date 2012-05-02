// Javascript Document.
var maincanvas; var ctx;
var smallcanvas; var bctx;
var brush;
var session;
var mousedown;
var x, y, px, py;
function brush_init() {
	maincanvas = document.getElementById("main_canvas");
	smallcanvas = document.getElementById("small_canvas");
	ctx = maincanvas.getContext("2d");
	bctx = smallcanvas.getContext("2d");
	brush = new NPR.Brush(ctx, NPR.makeBrushImage(32, 0.8, [0,0,0,1], smallcanvas));
	brush.makeBrushImage(32, 0.8, [0,0,0,1]);
	session = new NPR.PaintSession(ctx);
	session.setBrush(brush);

	//
	// DAT GUI initialization.
	//
	brushproperties = { "hardness" : 0.8,
						"size" : 32,
						"color" : [0, 0, 0, 1],
						"alpha" : 1,
						"undo" : function() {session.undo();} };
	var gui = new dat.GUI();
	gui.addColor(brushproperties, 'color').onChange(
		function(col){
		 console.log(col);
		 var c = [Math.floor(col[0]), Math.floor(col[1]), Math.floor(col[2]), col[3]];
		 brush.setColor(c);
		 onbrushchange();});
	gui.add(brushproperties, 'hardness', 0, 1).onChange(function(val){brush.setHardness(val); onbrushchange();} );
	gui.add(brushproperties, 'size', 0, 128).onChange(function(val){brush.setSize(val); onbrushchange();} );
	gui.add(brushproperties, 'alpha', 0, 1).onChange(function(val){brushproperties['color'][3] = val; brush.setColor(brushproperties['color']); onbrushchange();} );
	gui.add(brushproperties, 'undo');
	function onbrushchange() {
		session.setBrush(brush);
		smallcanvas.width = brush.r;
		smallcanvas.height = brush.r;
		brush.Draw(brush.r/2,brush.r/2,bctx);
	}
	//
	// Mouse events.
	//
	maincanvas.onmousedown = function(e) {
      mousedown = true;
      var p = getMousePos(maincanvas, e);
      px = x; py = y; x = p.x; y = p.y;
      //session.beginStroke(p.x,p.y);
    }
    document.onmouseup = function(e) {
      mousedown = false;
      //session.endStroke();
    }
    document.onmousemove = function(e) { 
      if(mousedown) {
	    var p = getMousePos(maincanvas, e);
	    px = x; py = y; x = p.x; y = p.y;
	    //brush.Draw(p.x,p.y);
	    //session.nextPoint(p.x,p.y);

	    brush.DrawLine(px, py, x, y);
	  }
    }
document.onclick = function(e) {
	var p = getMousePos(maincanvas, e);
	px = x; py = y; x = p.x; y = p.y;
	//brush.Draw(p.x,p.y);
}

brush.DrawLine(0,0,255,255);

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



