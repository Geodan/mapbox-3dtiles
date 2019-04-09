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

## Instructions
In a directory on your webserver run the folowing commands:
```
git clone https://github.com/Geodan/mapbox-3dtiles.git
cd mapbox-3dtiles/ahn
tar zxvf ahn_points.tar.gz
cd ../rotterdam
tar zxvf rotterdam_3dtiles_small.tar.gz
```
Next, copy file "apikeys.js.example" to "apikeys.js" and add your [mapbox token](https://docs.mapbox.com/help/how-mapbox-works/access-tokens/). Point your browser to the directory in question and you should see a basic viewer with 3d tiles content.

## Creating tilesets
Tilesets can be created using [py3dtiles](https://github.com/Oslandia/py3dtiles), using a PostGIS database table as source. The PostGIS table should contain 3D geometries in EPSG:3857 projection. 

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

Creating tileset using py3dtiles:

`py3dtiles export -D <database> -t <schema>.<table> -c <geom_column> -i <id_column> -u <db_user>`

Creating tileset from point cloud:

 `py3dtiles convert --srs_in <srs_in> --srs_out 3857 --out <tileset_name> pointcloud.las`
 
 For more information, see the [py3dtiles](https://github.com/Oslandia/py3dtiles) documentation.
 
