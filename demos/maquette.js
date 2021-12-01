
//mapboxgl.accessToken = apiKeys.mapboxAccessToken;
Mapbox3DTiles.DEBUG = debug;

// Load the maplibre map
var map = new maplibregl.Map({
    container: 'map',
    style: 'https://fileserv.beta.geodan.nl/mapbox/styles/basiskaart_style-dev.json',
    center: [4.90365, 52.35052], //Heveadorp
    zoom: 14,
    bearing: 0,
    pitch: 40,
    hash: true,
    antialias: true,
    bearingSnap: false
});
map.transform._fov = 0.4;
window.map = map; //DEBUG

map.on('style.load', function () {
    //map.showTileBoundaries = true;
    map.transform.maxPitch = 180;

    const threedee = new Mapbox3DTiles.Mapbox3DTilesLayer({
        id: 'maquette',
        dracoDecoderPath: "https://www.gstatic.com/draco/versioned/decoders/1.4.1/",
        tilesets: [
            {
                id: 'nl_niveau_3',
                url: 'https://fileserv.beta.geodan.nl/i3dm/dev/nl_niveau_3/tileset.json',
                renderOptions: {
                    horizonClip: true,
                    horizonFactor: 200
                }
            },
             {
                id: 'nl_niveau_2',
                url: 'https://fileserv.beta.geodan.nl/i3dm/dev/nl_niveau_2/tileset.json',
                renderOptions: {
                    horizonClip: true,
                    horizonFactor: 200
                }
            },
            {
                id: 'nl_niveau_1',
                url: 'https://fileserv.beta.geodan.nl/i3dm/dev/nl_niveau_1/tileset.json',
                renderOptions: {
                    horizonClip: true,
                    horizonFactor: 200
                }
            },
            {
                id: "nieuwbouw",
                url: "https://fileserv.beta.geodan.nl/b3dm/dev/cityengine/bsd_v2/tileset.json",
                renderOptions: {
                    horizonClip: false,
                    horizonFactor: 200
                }
              }
            /*{
                id: 'Kabels',
                url: 'https://fileserv.beta.geodan.nl/b3dm/dev/geodan_kabels/tileset.json',
                horizonClip: true,
                horizonFactor: 200,
                subsurface: true,
                style: {
                    id: 'basic-kabels',
                    type: 'basic',
                    settings: {
                        color: '#39909B'
                    }
                }
            } */
        ]
    });

    //https://saturnus.geodan.nl/maquette_nl_compressed/data/amsterdam_test/tileset.json
    //Test adding layer after creation
    
    threedee.tilesetManager.addTileset({
        id: 'maquette-compressed',
        url: 'https://beta.geodan.nl/data/buildingtiles/buildingtiles_nl_compressed_3857/tileset.json',
        //url: 'https://fileserv.beta.geodan.nl/test/heveadorp/gebouwen/tileset.json',
        style: {
            id: "light-shade",
            type: "shade",
            settings: {
                color: 0xffffff,
                opacity: 1,
                colorAttribute: 'id',
            }
        }
    }); 
 
    map.addLayer(threedee);

    threedee.scene.setHemisphereIntensity(0.75);
    threedee.scene.setShadowOpacity(0.15);
    threedee.scene.lights[1].position.set(85.95479335896457, -500.3727753754697, 861.5328543715947);
});

function getTileset(id) {
    const layer = map.getLayer("maquette");
    return layer.implementation.tilesetManager.getTileset(id);
}

function setStyleShader() {
    const tileset = getTileset('maquette-compressed');
    tileset.setStyle(new Mapbox3DTiles.BuildingShadeStyle('shader', { shadeOffset: 0.0,  colorA: 0x892121, colorB: 0xf7a10b}));
}

function setStyleShade() {
    const tileset = getTileset("maquette-compressed");
    tileset.setStyle({
        id: "light-shade",
        type: "shade",
        settings: {
            color: 0xffffff,
            opacity: 1,
            colorAttribute: 'id',
        }
    });
}

function setStyleRandom() {
    const tileset = getTileset("maquette-compressed");
    tileset.setStyle({
        id: "random-color",
        type: "random"
    });
}

function setEnergyStyle() {
    const tileset = getTileset("maquette-compressed");
    tileset.setStyle({
        id: "energy",
        type: "property",
        settings: {
            property: "energielabel",
            type: "property",
            fallback: [255, 255, 255],
            colors: [
                { operator: "equals", value: "a++++", color: [0, 144, 55] },
                { operator: "equals", value: "a+++", color: [0, 144, 55] },
                { operator: "equals", value: "a++", color: [0, 144, 55] },
                { operator: "equals", value: "a+", color: [0, 144, 55] },
                { operator: "equals", value: "a", color: [0, 144, 55] },
                { operator: "equals", value: "b", color: [85, 171, 38] },
                { operator: "equals", value: "c", color: [200, 209, 0] },
                { operator: "equals", value: "d", color: [255, 236, 0] },
                { operator: "equals", value: "e", color: [250, 186, 0] },
                { operator: "equals", value: "f", color: [235, 105, 9] },
                { operator: "equals", value: "g", color: [226, 0, 26] },
            ]
        }
    });
}

function setStyleYear() {
    const tileset = getTileset("maquette-compressed");
    tileset.setStyle({
        id: "building-year",
        type: "property",
        settings: {
            property: "bouwjaar",
            fallback: [255, 255, 255],
            colors: [
                {
                    operator: "smaller-than",
                    value: 1800,
                    color: [165, 0, 38]
                },
                {
                    operator: "range",
                    value: [1800, 1849],
                    color: [215, 48, 39]
                },
                {
                    operator: "range",
                    value: [1850, 1899],
                    color: [244, 109, 67]
                },
                {
                    operator: "range",
                    value: [1900, 1929],					
                    color: [253, 174, 97]
                },
                {
                    operator: "range",
                    value: [1930, 1944],					
                    color: [254, 224, 144]
                },
                {
                    operator: "range",
                    value: [1945, 1959],					
                    color: [255, 255, 191]
                },
                {
                    operator: "range",
                    value: [1960, 1974],					
                    color: [224, 243, 248]
                },
                {
                    operator: "range",
                    value: [1975, 1984],					
                    color: [171, 217, 233]
                },
                {
                    operator: "range",
                    value: [1985, 1994],					
                    color: [116, 173, 209]
                },
                {
                    operator: "range",
                    value: [1995, 2004],					
                    color: [69, 117, 180]
                },
                {
                    operator: "greater-than",
                    value: 2004,
                    color: [49, 54, 149]
                },
            ]
        }
    });
}

const shade = document.querySelector('#shade');
const random = document.querySelector('#random');
const year = document.querySelector('#year');
const energy = document.querySelector('#energy');
const shader = document.querySelector('#shader');

shade.addEventListener('change', (e) => { if (shade.checked) { setStyleShade(); }});
random.addEventListener('change', (e) => { if (random.checked) { setStyleRandom(); }});
year.addEventListener('change', (e) => { if (year.checked) { setStyleYear(); }});
energy.addEventListener('change', (e) => { if (energy.checked) { setEnergyStyle(); }});
shader.addEventListener('change', (e) => {
    if (shader.checked) {
        setStyleShader();
    }
});

map.once('idle', async () => {
    const topLabelLayers = [
        'place-other',
        'place-village',
        'place-town',
        'place-city',
        'place-city-capital'
    ];
    for (let id of topLabelLayers) {
        if (map.getLayer(id)) {
            map.moveLayer(id); // move to top
        } else {
            console.warn(`Top label layer '${id}' not found`);
        }
    }
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

