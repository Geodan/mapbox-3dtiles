# mapbox-3dtiles
3D Tiles implementation using Mapbox GL JS custom layers

See [https://geodan.github.io/mapbox-3dtiles/](https://geodan.github.io/mapbox-3dtiles/) for a working demo.

![Screenshot](https://github.com/Geodan/mapbox-3dtiles/raw/master/screenshot.png)

This is a proof-of-concept implementation of a [3D Tiles](https://github.com/AnalyticalGraphicsInc/3d-tiles) viewer as a [Mapbox GL JS](https://github.com/mapbox/mapbox-gl-js) custom layer. WebGL rendering is implemented using [three.js](https://github.com/mrdoob/three.js/). Only Web Mercator (EPSG:3857) tilesets are supported, as this is the projection mapbox uses. Earth-centered earth-fixed tilesets are explicitly not supported. Tilesets used for testing were generated using [pg2b3dm](https://github.com/Geodan/pg2b3dm), using a PostGIS database with EPSG:3857 geometries.

This is by no means a complete implementation of the 3D Tile specification. Currently the following features are supported:

* Geometric error based tile loading
* Replacement and additive refinement
* Only Box bounding volumes are supported
* Tile transforms
* External tilesets
* Tile types:
	* Batched 3D Model (b3dm)
	* Point Cloud (pnts): basic implementation
* Draco compressed i3dm and b3dm tiles

The following features are not supported at this time:
* Any coordinate system other than EPSG:3857
* Region and sphere bounding volumes
* Viewer request volumes
* Instanced 3D Model (i3dm) tiles
* Composite (cmpt) tiles
* [3D Tile Styles](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification/Styling)

## Instructions
In a directory on your webserver run the folowing commands:
```
git clone https://github.com/Geodan/mapbox-3dtiles.git
cd mapbox-3dtiles
npm install
tar xvf data.tar.bz2
```
Next, copy file "apikeys.js.example" to "apikeys.js" and add your [mapbox token](https://docs.mapbox.com/help/how-mapbox-works/access-tokens/). 

You can then start the development environment:
```
npm start
```
Point your browser to http://localhost:8082 for an overview page of demo's.

## Draco compression
Draco compressed data can be used with Mapbox-3DTiles, to do this create an pass an Threejs dracoloader to the layer.


```
import { DRACOLoader } from '../node_modules/three/examples/jsm/loaders/DRACOLoader.js';

var dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/assets/draco/');

const myLayer = new Mapbox3DTiles.Mapbox3DTilesLayer(
	{
		id: 'my_awesome_layer',
		url: 'https://my-layer/tileset.json',
		dracoLoader: dracoLoader
	}
);
```

Copy the needed draco assets to /assets/draco (for the above example). See package.json for an example, make sure the draco assets match the threejs version of Mapbox-3DTiles.
```
"copy": "ncp ./node_modules/three/examples/js/libs/draco ./assets/draco"
```

## Creating tilesets
Tilesets can be created using [pg2b3dm](https://github.com/Geodan/pg2b3dm), using a PostGIS database table as source. The PostGIS table should contain 3D geometries in EPSG:3857 projection. 

Example query creating extruded 3D buildings in EPSG:3857:
```
DROP TABLE IF EXISTS <schema>.<output_table>;
CREATE TABLE <schema>.<output_table> AS (
	WITH extent AS (
		SELECT ST_MakeEnvelope(<minx>, <miny>, <maxx>, <maxy>, <input_srid>) geom
	),
	footprints AS (
		SELECT a.id AS id, a.height, a.geom
		FROM <schema>.<input_table> a, extent b
		WHERE ST_Intersects(a.geom, b.geom)
	)
	SELECT id, ST_Force3D(ST_Extrude(ST_Transform(ST_MakeValid(geom), 3857), 0, 0, height)) AS geom
	FROM footprints
);
DELETE FROM <schema>.<output_table> WHERE geom IS NULL; -- cleanup
DELETE FROM <schema>.<output_table> WHERE ST_GeometryType(geom) NOT LIKE 'ST_PolyhedralSurface'; -- cleanup
```

Creating tileset using pg2b3dm:

`pg2b3dm -h <my_host> -U <my_user> -d <my_database> -p <my_port> -c <geom_column> -t <my_schema.my_table>`

For more information, see the [pg2b3dm](https://github.com/Geodan/pg2b3dm) documentation.

Creating tileset from point cloud:

Pointcloud data is not yet supported by pg2b3dm and needs to be exporterd with an earlier tool called [py3dtiles](https://github.com/Oslandia/py3dtiles)

 `py3dtiles convert --srs_in <srs_in> --srs_out 3857 --out <tileset_name> pointcloud.las`
 
 For more information, see the [py3dtiles](https://github.com/Oslandia/py3dtiles) documentation.
 
