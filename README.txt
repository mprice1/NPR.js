NPR.js - a small toolkit for nonphotorealistic rendering effects in WebGL.

The main effects:
 - Painterly Rendering ('Painterly Rendering for Animation' '96)
 - Graftals ('Art-Based Rendering of Fur, Grass, and Trees' '99)
 - Contour Outlines ('Hardware-Determined Feature Edges')
 - Hatching/Tonal Art Maps ('Real-Time Hatching' '01)

This isn't ready to pull and use out of the box yet, still moving stuff around, cleaning, etc.
It's also a bit experimental, and seems to only work on Chrome for me at the moment.
Heavy use is made of the OES_TEXTURE_FLOAT extension, and graphics cards need to have 4 vertex texture units to use some important shaders.