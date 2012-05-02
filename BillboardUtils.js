var NPR = NPR || {};

//
// This file contains utility functions for working with billboards.
//

// Given a number of instances, creates the required geometry buffers to draw instanced
// billboards.  Each billboard is made of two triangles and makes a 2d unit square centered
// at the origin.  This also produces an InstanceID vertex attribute that is the billboard
// instance for each vertex.
// Rather than waste another vertex buffer for texture coordinates, it is assumed that the 
// vertex position + vec2(0.5, 0.5) will be used in the shader for texture lookups.
NPR.createInstancedBillboardBuffers = function(gl, num_billboards) {
  var squarePoly = new NPR.Triangles();
  squarePoly.addPoint(-.5,  .5);
  squarePoly.addPoint(-.5, -.5);
  squarePoly.addPoint( .5,  .5);
  squarePoly.addPoint( .5,  .5);
  squarePoly.addPoint(-.5, -.5);
  squarePoly.addPoint( .5, -.5);
  return squarePoly.makeInstancedVertexBuffer(gl, num_billboards);
}