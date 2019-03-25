# mapbox-3dtiles
3D Tiles implementation using Mapbox GL JS custom layers

![Screenshot](https://github.com/Geodan/mapbox-3dtiles/raw/master/screenshot.png)

This is a proof-of-concept implementation of a [3D Tiles](https://github.com/AnalyticalGraphicsInc/3d-tiles) viewer as a [Mapbox GL JS](https://github.com/mapbox/mapbox-gl-js) custom layer. WebGL rendering is implemented using [three.js](https://github.com/mrdoob/three.js/). Only Web Mercator (EPSG:3857) tilesets are supported, as this is the projection mapbox uses. Earth-centered eart-fixed tilesets are explicitly not supported. Tilesets used for testing were generated using [py3dtiles](https://github.com/Oslandia/py3dtiles), using a PostGIS database with EPSG:3857 geometries.

This is by no means a complete implementation of the 3D Tile specification. Currently the following features are supported:

* Geometric error based tile loading
* Replacement and additive refinement
* Only Box bounding volumes are supported
* Tile transforms
* External tilesets
* Tile types:
	* Batched 3D Model (b3dm)
	* Point Cloud (pnts): basic implementation

The following features are not supported at this time:
* Any coordinate system other than EPSG:3857
* Region and sphere bounding volumes
* Viewer request volumes
* Instanced 3D Model (i3dm) tiles
* Composite (cmpt) tiles
* [3D Tile Styles](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification/Styling)
