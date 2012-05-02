var NPR = NPR || {};

// Shader wrapper that is a stripped down version of the Shader object
// from Evan Wallace's lightgl.js library: https://github.com/evanw/lightgl.js.
// The clever pieces of type-checking on uniform values and particularly the 
// 
NPR.Shader = function(vertex_src, fragment_src) {
	
  var gl = NPR.gl;

  function compileSource(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw 'compile error: ' + gl.getShaderInfoLog(shader);
    }
    return shader;
  }
  
  // Compile and link the shader programs.
  this.program = gl.createProgram();
  gl.attachShader(this.program, compileSource(gl.VERTEX_SHADER, vertex_src));
  gl.attachShader(this.program, compileSource(gl.FRAGMENT_SHADER, fragment_src));
  gl.linkProgram(this.program);
  if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
    throw 'link error: ' + gl.getProgramInfoLog(this.program);
  }
  
  // This is the list of per-model attributes required for drawing.
  // When a model is drawn, the attributes in this list are requested from the model.
  // If any is missing, an exception is thrown.
  // Note that this is a mapping of Buffer Name (versus attribute name) to attribute pointer.
  this.attributes = {};

  //
  // Clever features taken from lightgl.
  //

  // Sampler uniforms need to be uploaded using `gl.uniform1i()` instead of `gl.uniform1f()`.
  // To do this automatically, we detect and remember all uniform samplers in the source code.
  function regexMap(regex, text, callback) {
    while ((result = regex.exec(text)) != null) {
      callback(result);
    }
  }
  var isSampler = {};
  regexMap(/uniform\s+sampler(1D|2D|3D|Cube)\s+(\w+)\s*;/g, vertex_src + fragment_src, function(groups) {
    isSampler[groups[2]] = 1;
  });
  this.isSampler = isSampler;
  // End auto detection of samplers.

  // These functions are for inferring uniform types from the value's type.
  function isArray(obj) {
    var str = Object.prototype.toString.call(obj);
    return str == '[object Array]' || str == '[object Float32Array]';
  }
  function isNumber(obj) {
    var str = Object.prototype.toString.call(obj);
    return str == '[object Number]' || str == '[object Boolean]';
  }

  // Given a map of uniform names and values, set all uniforms that can be found in the shader.
  // Infer the correct type of uniform from the value type, length (if array),
  // and internal record of sampler names.
  this.setUniforms = function(uniform_vals) {
  	gl.useProgram(this.program);
  	for (var name in uniform_vals) {
  	  var location = gl.getUniformLocation(this.program, name);
      if (!location) continue;
      var value = uniform_vals[name];
        if (isArray(value)) {
        switch (value.length) {
          case 1: gl.uniform1fv(location, new Float32Array(value)); break;
          case 2: gl.uniform2fv(location, new Float32Array(value)); break;
          case 3: gl.uniform3fv(location, new Float32Array(value)); break;
          case 4: gl.uniform4fv(location, new Float32Array(value)); break;
          case 9: gl.uniformMatrix3fv(location, false, new Float32Array(value)); break;
          case 16: gl.uniformMatrix4fv(location, false, new Float32Array(value)); break;
          default: throw 'don\'t know how to load uniform "' + name + '" of length ' + value.length;
        }
      } else if (isNumber(value)) {
        (this.isSampler[name] ? gl.uniform1i : gl.uniform1f).call(gl, location, value);
      } else {
        throw 'attempted to set uniform "' + name + '" to invalid value ' + value;
      }
  	}
  }

  //
  // End clever features taken from lightgl.
  //

  // The matrix uniforms are handled separately for convenience.
  // They may instead be set with setUniforms() if desired.
  gl.useProgram(this.program);
  this.pMatrixUniform = gl.getUniformLocation(this.program, "uPMatrix");
  this.mvMatrixUniform = gl.getUniformLocation(this.program, "uMVMatrix");
  this.nMatrixUniform = gl.getUniformLocation(this.program, "uNMatrix");
  
  this.setMatrixUniforms = function(mvMatrix, pMatrix, nMatrix) {
  gl.useProgram(this.program);
  if (this.mvMatrixUniform && mvMatrix)
    gl.uniformMatrix4fv(this.mvMatrixUniform, false, mvMatrix);
  if (this.pMatrixUniform && pMatrix)
    gl.uniformMatrix4fv(this.pMatrixUniform, false, pMatrix);
  if (this.nMatrixUniform && nMatrix)
    gl.uniformMatrix3fv(this.nMatrixUniform, false, nMatrix);
  }

  // Draw a model with the shader, assuming the uniforms have been set.
  // If point_samples evaluates to true, then draw using the RandomSampleBuffer as gl.POINTS.
  this.drawModel = function(model, type, buffer_name, buffer_is_elements) {
  	gl.useProgram(this.program);
  	// Bind all the required attributes.
  	for (buffer in this.attributes) {
  		if (!model[buffer]) throw 'drawing error: missing buffer: ' + buffer; 
  		gl.bindBuffer(gl.ARRAY_BUFFER, model[buffer]);
  		gl.vertexAttribPointer(this.attributes[buffer], model[buffer].itemSize, gl.FLOAT, false, 0, 0);
  		gl.enableVertexAttribArray(this.attributes[buffer]);
  	}

    // Whether we are drawing as element arrays or not.
    var draw_arrays = ((!buffer_name) && model["VertexIndexBuffer"]) || buffer_is_elements;

    // If buffer_name is supplied, it is understood that it will replace the VertexPositionBuffer.
    if (buffer_name && model[buffer_name] && !draw_arrays) {
      gl.bindBuffer( draw_arrays ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER, model[buffer_name]);
      gl.vertexAttribPointer(this.attributes["VertexPositionBuffer"], model[buffer_name].itemSize, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.attributes["VertexPositionBuffer"]);
    }


    var draw_type = type !== undefined ? type : gl.TRIANGLES;
    var buffer_used = (buffer_name && model[buffer_name]) ? buffer_name 
                                                          : (model["VertexIndexBuffer"] ? "VertexIndexBuffer" 
                                                                                        : "VertexPositionBuffer");
    if (draw_arrays) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model[buffer_used]);
      gl.drawElements(draw_type, model[buffer_used].numItems, gl.UNSIGNED_SHORT, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, model[buffer_used]);
      gl.drawArrays(draw_type, 0, model[buffer_used].numItems );
      gl.bindBuffer(gl.ARRAY_BUFFER, null); 
    }	
  }

  this.bind = function() {
    gl.useProgram(this.program);
  }
  this.release = function() {
    gl.useProgram(null);
  }
}