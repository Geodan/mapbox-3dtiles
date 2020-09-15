mapboxgl.accessToken = apiKeys.mapboxAccessToken;
const urlParams = new URLSearchParams(window.location.search);
const debug = urlParams.get('debug') ? urlParams.get('debug') == 'true' : false;
const update = urlParams.get('update') ? parseInt(urlParams.get('update')) : 0;
const light = urlParams.get('light') ? urlParams.get('light') == 'true' : false;
document.querySelector('#debug').checked = debug;
document.querySelector('#light').checked = light;
if (light) {
    document.querySelectorAll('.container').forEach((container) => container.classList.add('light'));
}

//Mapbox3DTiles.DEBUG = debug;

document.querySelector('#debug').addEventListener('change', function (e) {
    window.location = `${window.location.origin}${window.location.pathname}?debug=${e.target.checked}&light=${light}${window.location.hash}`;
});
document.querySelector('#light').addEventListener('change', function (e) {
    window.location = `${window.location.origin}${window.location.pathname}?debug=${debug}&light=${e.target.checked}${window.location.hash}`;
});

const style = {
    version: 8,
    name: 'EmptyStyle',
    id: 'emptystyle',
    sources: {},
    layers: [
        {
            id: 'background',
            type: 'background',
            paint: { 'background-color': 'lightgrey' },
            layout: { visibility: 'visible' }
        }
    ]
};
// Load the mapbox map
var map = new mapboxgl.Map({
    container: 'map',
    //style: style,
    style: `mapbox://styles/mapbox/${light ? 'light' : 'dark'}-v10?optimize=true`,
    center: [5.59853602, 51.46206127], //BSD, Helmond
    zoom: 14.3,
    bearing: 0,
    pitch: 45,
    hash: true
});

map.on('style.load', function () {
    map.addSource('project_area', {
        type: 'geojson',
        data: 'https://bsd-acc.beta.geodan.nl/featureserv/collections/bsd.lots/items.json?limit=200'
    });
    map.addLayer({
        id: 'project_area_outline',
        type: 'line',
        source: 'project_area',
        paint: {
            'line-color': '#1C5A6D',
            'line-width': 2
        }
    });

    const tileslayer = new Mapbox3DTiles.Mapbox3DTilesLayer(
        {
            id: 'maquette',
            url: 'https://beta.geodan.nl/maquette_nl/data/buildingtiles_bsd_3857/tileset.json',
            color: 0xffffff,
            opacity: 1
        },
        'waterway-label'
    );
    map.addLayer(tileslayer);

    const ifcmodels = new Mapbox3DTiles.Mapbox3DTilesLayer({
        id: 'woonconnect',
        url: 'https://bsd-acc.beta.geodan.nl/3dtiles/tileset.json',
        projectToMercator: true
    });
    map.addLayer(ifcmodels);

    map.on('mousemove', (event) => {
        return;
        let infoElement = document.querySelector('#info');
        let features = map.queryRenderedFeatures(event.point, {
            outline: true,
            outlineColor: 0xff0000
        });
        if (features.length) {
            infoElement.innerHTML = features
                .map(
                    (feature) =>
                        `Layer: ${feature.layer.id}<br>
                        ${Object.entries(feature.properties)
                            .map((entry) => `<b>${entry[0]}:</b>${entry[1]}`)
                            .join('<br>\n')}
                `
                )
                .join('<hr>\n');
        } else {
            infoElement.innerHTML = 'Hover map objects for info';
        }
    });
    
    map.on('click', (event) => {
        let features = map.queryRenderedFeatures(event.point, {
            outline: true,
            outlineColor: 0xff0000
        });

        if(!features || features.length === 0) {
            return;
        }
    
        const layerId = features[0].layer.id;
        const layer = map.getLayer(layerId);
        const b3dmId = features[0].properties.b3dm;
        layer.implementation.highlight.add(b3dmId);
        layer.implementation.marker.add(b3dmId, '../icons/selectedHouse.svg', 1.0, { x: 0, y: 0, z: 0 }, function () { console.log(b3dmId); })
    });

    map.repaint = true;
});

