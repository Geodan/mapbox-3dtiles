import { DRACOLoader } from '../node_modules/three/examples/jsm/loaders/DRACOLoader.js';

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

// Load the mapbox map
var map = new mapboxgl.Map({
    container: 'map',
    style: blankStyle,
    center: [5.895951, 51.827826], //Nijmegen
    zoom: 15,
    bearing: -50,
    pitch: 60,
    hash: true,
    antialias: true,
    bearingSnap: false
});

map.on('style.load', function () {
    map.showTileBoundaries = true;
    map.transform.maxPitch = 180;
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.4.1/");

    const threedee = new Mapbox3DTiles.Mapbox3DTilesLayer({
        id: 'maquette',
        dracoLoader: this.dracoLoader,
        tilesets: [
            {
                id: 'terrain',
                url: 'https://fileserv.beta.geodan.nl/test/nijmegen/terrein/tileset.json',
                horizonClip: false,
            },
            {
                id: 'maquette-nijmegen',
                url: 'https://fileserv.beta.geodan.nl/test/nijmegen/gebouwen/tileset.json',
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
                url: 'https://fileserv.beta.geodan.nl/test/nijmegen/cmpt_city/tileset.json',
                horizonClip: true,
                horizonFactor: 200
            },
            {
                id: 'nl_niveau_2',
                url: 'https://fileserv.beta.geodan.nl/test/nijmegen/cmpt_detail/tileset.json',
                horizonClip: true,
                horizonFactor: 200
            },
            {
                id: 'nl_niveau_3',
                url: 'https://fileserv.beta.geodan.nl/test/nijmegen/cmpt_street/tileset.json',
                horizonClip: true,
                horizonFactor: 200
            },
        ]
    });
 
    map.addLayer(threedee);

    threedee.scene.setHemisphereIntensity(0.75);
    threedee.scene.setShadowOpacity(0.15);
    threedee.scene.lights[1].position.set(85.95479335896457, -500.3727753754697, 861.5328543715947);
});

map.once('idle', async () => {

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

