import { DRACOLoader } from '../node_modules/three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFExporter } from '../node_modules/three/examples/jsm/exporters/GLTFExporter.js'

mapboxgl.accessToken = apiKeys.mapboxAccessToken;
Mapbox3DTiles.DEBUG = debug;

const blankStyle = {
    version: 8,
    name: "Blank",
    center: [5.895951, 51.827826],
    zoom: 0,
    sources: {},
    layers: [],
    id: "blank"
  }

function setLights(id) {
    const layer = map.getLayer("maquette");
    return layer.implementation.tilesetManager.getTileset(id);
}

// Load the mapbox map
var map = new mapboxgl.Map({
    container: 'map',
    style: blankStyle,
    center: [5.903914, 51.834602], //Nijmegen
    zoom: 15,
    bearing: -129,
    pitch: 60,
    hash: true,
    antialias: true,
    bearingSnap: false
});

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.4.1/");

const threedee = new Mapbox3DTiles.Mapbox3DTilesLayer({
    id: 'maquette',
    dracoLoader: dracoLoader,
    tilesets: [
        {
            id: "terrain",
            url: "https://beta.geodan.nl/data/terraintiles/terraintiles_2879_compressed_3857/tileset.json",
            horizonClip: false,
            castShadow: false,
            receiveShadow: true,
        },
       {
            id: 'geotop',
            url: 'https://beta.geodan.nl/data/geotoptiles/geotoptiles_2879_3857/tileset.json',
            horizonClip: false,
            castShadow: false,
            receiveShadow: false
        },
        {
            id: 'maquette-ubbergen',
            url: 'https://beta.geodan.nl/data/buildingtilesz/buildingtilesz_2879_compressed_3857/tileset.json',
            style: {
                id: "light-shade",
                type: "shade",
                settings: {
                    color: 0xffffff,
                    opacity: 1,
                    colorAttribute: 'id',
                }
            }
        },
        {
            id: 'nl_niveau_1',
            url: 'https://fileserv.beta.geodan.nl/test/ubbergen/cmpt_city/tileset.json',
            horizonClip: true,
            horizonFactor: 200,
            castShadow: true,
            receiveShadow: false
        },
        {
            id: 'nl_niveau_3',
            url: 'https://fileserv.beta.geodan.nl/test/ubbergen/cmpt_street/tileset.json',
            horizonClip: true,
            horizonFactor: 200,
            castShadow: true,
            receiveShadow: false
        },
    ]
});

map.on('style.load', function () {
    map.showTileBoundaries = false;
    map.transform.maxPitch = 180;
    map.addLayer(threedee);

    threedee.scene.removeShadow();
    threedee.scene.addTerrainShadowWorkaround();
    threedee.scene.setHemisphereIntensity(0.75);
    threedee.scene.setShadowOpacity(0.05);
    threedee.scene.lights[1].position.set(85.95479335896457, -500.3727753754697, 861.5328543715947);
});

function save(blob, filename) {
    const link = document.createElement( 'a' );
        link.style.display = 'none';
        document.body.appendChild( link ); // Firefox workaround, see #6594
        
    link.href = URL.createObjectURL( blob );
    link.download = filename;
    link.click();
    // URL.revokeObjectURL( url ); breaks Firefox...
}

function saveString(text, filename) {
    save( new Blob( [ text ], { type: 'text/plain' } ), filename );
}

function saveArrayBuffer(buffer, filename) {
    save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );
}

function exportGLTF( ) {
    const gltfExporter = new GLTFExporter();
    const options = {
        //trs: true,
        //onlyVisible: false,
        //truncateDrawRange: false,
        //forceIndices: true,
        //includeCustomExtensions: true
        //binary: document.getElementById( 'option_binary' ).checked,
        //maxTextureSize: Number( document.getElementById( 'option_maxsize' ).value ) || Infinity // To prevent NaN value
    };

    gltfExporter.parse( threedee.scene,  ( result ) => {
        if ( result instanceof ArrayBuffer ) {
            saveArrayBuffer( result, 'scene.glb' );
        } else {
            const output = JSON.stringify(result, null, 2 );
            console.log(output);
            saveString( output, 'scene.gltf');
        }

    }, options);
}

const btnExport = document.querySelector('#btn-export');
btnExport.addEventListener('click', (e) => { exportGLTF(); });

function getTileset(id) {
    const layer = map.getLayer("maquette");
    return layer.implementation.tilesetManager.getTileset(id);
}

function setBgtStyle() {
    const tileset = getTileset("terrain");
    tileset.setStyle({
        id: "bgt",
        type: "property",
        settings: {
            property: "landuse",
            type: "property",
            fallback: [255, 255, 255],
            colors: [
                { operator: "equals", value: "berm", color: [235,240,233] },
                { operator: "equals", value: "boomteelt", color: [165,220,117]},
                { operator: "equals", value: "bouwland", color: [241,244,199]},
                { operator: "equals", value: "dek", color: [224,224,224]},
                { operator: "equals", value: "duin", color: [245,255,221]},
                { operator: "equals", value: "erf", color: [241,244,199]},
                { operator: "equals", value: "fietspad", color: [206,111,100]},
                { operator: "equals", value: "fruitteelt", color: [204,108,166]},
                { operator: "equals", value: "gemengd bos", color: [117,146,90]},
                { operator: "equals", value: "gesloten verharding", color: [201,201,201]},
                { operator: "equals", value: "grasland agrarisch", color: [241,244,199]},
                { operator: "equals", value: "grasland overig", color: [186,221,105]},
                { operator: "equals", value: "greppel, droge sloot", color: [200,232,189]},
                { operator: "equals", value: "groenvoorziening", color: [186,221,105]},
                { operator: "equals", value: "half verhard", color: [201,172,153]},
                { operator: "equals", value: "heide", color: [242,160,237]},
                { operator: "equals", value: "houtwal", color: [121,213,84]},
                { operator: "equals", value: "inrit", color: [201,201,201]},
                { operator: "equals", value: "kunstwerkdeel", color: [114,133,132]},
                { operator: "equals", value: "kwelder", color: [200,232,189]},
                { operator: "equals", value: "landhoofd", color: [0,0,0]},
                { operator: "equals", value: "loofbos", color: [88,153,60]},
                { operator: "equals", value: "moeras", color: [241,244,199]},
                { operator: "equals", value: "naaldbos", color: [88,153,60]},
                { operator: "equals", value: "oever slootkant", color: [241,244,199]},
                { operator: "equals", value: "onverhard", color: [201,172,153]},
                { operator: "equals", value: "open verharding", color: [255,247,241]},
                { operator: "equals", value: "OV-baan", color: [201,201,201]},
                { operator: "equals", value: "overigbouwwerk", color: [201,172,153]},
                { operator: "equals", value: "overweg", color: [201,201,201]},
                { operator: "equals", value: "pand", color: [255,213,173]},
                { operator: "equals", value: "parkeervlak", color: [201,201,201]},
                { operator: "equals", value: "pijler", color: [224,224,224]},
                { operator: "equals", value: "pyloon", color: [224,224,224]},
                { operator: "equals", value: "rietland", color: [241,244,199]},
                { operator: "equals", value: "rijbaan autosnelweg", color: [201,201,201]},
                { operator: "equals", value: "rijbaan autoweg", color: [201,201,201]},
                { operator: "equals", value: "rijbaan lokale weg", color: [233,205,187]},
                { operator: "equals", value: "rijbaan regionale weg", color: [201,201,201]},
                { operator: "equals", value: "Ruiterpad", color: [201,172,153]},
                { operator: "equals", value: "slik", color: [230,219,213]},
                { operator: "equals", value: "sloof", color: [224,224,224]},
                { operator: "equals", value: "spoorbaan", color: [98,98,98]},
                { operator: "equals", value: "struiken", color: [121,213,84]},
                { operator: "equals", value: "transitie", color: [255,255,255]},
                { operator: "equals", value: "vliegveld", color: [219,219,219]},
                { operator: "equals", value: "voetgangersgebied", color: [255,247,241]},
                { operator: "equals", value: "voetpad", color: [255,247,241]},
                { operator: "equals", value: "voetpad op trap", color: [255,247,241]},
                { operator: "equals", value: "waterloop", color: [165,191,221]},
                { operator: "equals", value: "watervlakte", color: [165,191,221]},
                { operator: "equals", value: "woonerf", color: [255,247,241]},
                { operator: "equals", value: "zand", color: [255,254,181]},
                { operator: "equals", value: "zee", color: [165,191,221]}
            ]
        }
    });
}

function setGeotopStyle() {
    const tileset = getTileset("geotop");
    tileset.setStyle({
        id: "geotop",
        type: "property",
        settings: {
            property: "lithoklasse",
            type: "property",
            fallback: [100, 100, 100],
            colors: [
                { operator: "equals", value: "0", color: [193,195,198] },        
                { operator: "equals", value: "1", color: [152,80,69] },
                { operator: "equals", value: "2", color: [24,159,72]},
                { operator: "equals", value: "3", color: [182,209,105]},
                { operator: "equals", value: "5", color: [255,240,0]},
                { operator: "equals", value: "6", color: [255,220,0]},
                { operator: "equals", value: "7", color: [255,200,0]},
                { operator: "equals", value: "8", color: [255,180,0]},
                { operator: "equals", value: "11", color: [0,136,255]}
            ]
        }
    });
}

map.once('idle', async () => {
    setBgtStyle();
    setGeotopStyle();
});

map.on('click', (event) => {
    let infoElement = document.querySelector('#info');
    let features = map.queryRenderedFeatures(event.point, { outline: true, outlineColor: 0xff0000 });
    if (features.length) {
        infoElement.innerHTML =
            features.map(feature =>
                `Layer: ${feature.layer.id}<br>
                    ${Object.entries(feature.properties).map(entry => `<b>${entry[0]}:</b>${entry[1]}`).join('<br>\n')}
            `).join('<hr>\n')
    } else {
        infoElement.innerHTML = "Hover map objects for info";
    }
})

