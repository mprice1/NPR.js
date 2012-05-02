// Javascript Document.

var NPR = NPR || {};

//
// This file contains functions useful for making a simple 2d painting application using
// the HTML5 canvas element.
//
(function(){
//
// Class Brush
//
NPR.Brush = function(dest_ctx, brush_image) {  
  this.Properties = function() { return new NPR.BrushProperties(this.size, this.color, this.hardness);}
 
  // Initialization.
  // Members:
  // r, hardness, color, dest_ctx, bru
  if(dest_ctx) this.dest_ctx = dest_ctx;
  if(brush_image) this.setBrushImage(brush_image);
}

var Brush = NPR.Brush;

Brush.prototype.Draw = function(x,y,ctx) {
    (ctx ? ctx : this.dest_ctx)
        .drawImage(this.brush_image, x-this.r/2, y-this.r/2);
}

Brush.prototype.DrawLine = function(px, py, x, y, ctx) {
	var c = ctx ? ctx : this.dest_ctx;
	var dx = x - px, dy = y - py;
	var l = Math.sqrt(dx*dx + dy*dy);
	for (var i = 0; i < l / this.r*2; i++) {
		c.drawImage(this.brush_image, x-this.r/2 - (i/l*this.r)*dx/2, y-this.r/2 - (i/l*this.r)*dy/2);
	}
}

Brush.prototype.fromProperties = function(p) {
  	this.makeBrushImage(p.size, p.hardness, p.color);
}

Brush.prototype.setBrushImage = function(brush_image) {
  this.brush_image = brush_image;
  this.r = brush_image.width;
}

// Makes a new brush image.
Brush.prototype.makeBrushImage = function(size, hardness, color, bcanvas) {
  this.r = size; this.hardness = hardness; this.color = color;
  this.setBrushImage(NPR.makeBrushImage(size, hardness, color, bcanvas));
}

Brush.prototype.setColor = function(color) {
  this.makeBrushImage(this.r, this.hardness, color);
}

Brush.prototype.setSize = function(size) {
  this.makeBrushImage(size, this.hardness, this.color);
}

Brush.prototype.setHardness = function(hardness) {
  this.makeBrushImage(this.r, hardness, this.color);
}

//
// Class BrushProperties
// This should contain enough information to construct a brush exactly.
// TODO: If/when custom alphas are supported, this class must be updated to use them.
//
NPR.BrushProperties = function(size, color, hardness) {
	this.size = size || 32;
	this.color = color || [0,0,0,1];
	this.hardness = hardness==undefined ? 0.9 : hardness;
}


//
// Class PaintSession.
// Represents a persistent session of strokes and brush changes that may be replayed,
// undone, or recorded.  It is not necessary to use a PaintSession if its functionality
// is not required.
//
NPR.PaintSession = function(sctx) {
	// Convenience methods to build a stroke over time inside of the PaintSession class.
	this.beginStroke = function(x,y) { this.newstroke = []; this.newstroke[0] = [x,y];}
	this.nextPoint = function(x,y) { this.newstroke.push([x,y]); }
	this.endStroke = function() { 
		if(this.newstroke) this.actions.push(this.newstroke);
		this.newstroke = undefined;
		console.log("Actions:" + this.actions.length); 
	}
	this.addStroke = function(stroke) { this.actions.push(stroke); }
	this.drawStroke = function(stroke) {
	  for (var i = 0; i < stroke.length; i++) {
	  	this.brush.Draw(stroke[i][0], stroke[i][1]);
	  }
	}
	this.undo = function() {
		this.actions.pop();
		ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
		for (var i = 0; i < this.actions.length; i++) {
			if (this.actions[i] instanceof Array) this.drawStroke(this.actions[i]);
		}
	}
	this.setBrush = function(brush) { 
		this.brush = brush;
		new_properties = brush.Properties();
		if (this.brush && this.actions[this.actions.length-1] instanceof NPR.BrushProperties)
		  this.actions[this.actions.length-1] = new_properties;
		else this.actions.push(brush.Properties());
	}
	// Initialization.
	// Members:  brush
	this.actions = [];
	this.sctx = sctx;
}

// Creates (or redraws) a canvas for brush alpha made by drawing a radial gradient.
NPR.makeBrushImage = function(size, hardness, color, bcanvas) {
	var c;
	if (bcanvas) c = bcanvas;
	else c = document.createElement('canvas');
	c.width = size;
	c.height = size;
    var ctx = c.getContext('2d');
    hardness = Math.max(Math.min(hardness, 0.9999), 0);
    var r = size/2;
    var g = ctx.createRadialGradient(r, r, hardness * r,
	                                 r, r, r);
    g.addColorStop(0, 'rgba('+color[0]+','+color[1]+','+color[2]+','+color[3]+')');
    g.addColorStop(1, 'rgba('+color[0]+','+color[1]+','+color[2]+',0)');
    ctx.fillStyle = g;
    ctx.clearRect(0, 0, size, size);
    ctx.fillRect(0,0,size,size);
    ctx.fill();
    return c;
}

})();