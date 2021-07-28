mapboxgl.accessToken = apiKeys.mapboxAccessToken;
const urlParams = new URLSearchParams(window.location.search);
const debug = urlParams.get('debug') ? urlParams.get('debug') == "true" : false;
const update = urlParams.get('update') ? parseInt(urlParams.get('update')) : 0;
const light = urlParams.get('light') ? urlParams.get('light') == "true" : false;
document.querySelector('#debug').checked = debug;
document.querySelector('#light').checked = light;
if (light) {
	document.querySelectorAll('.container').forEach(container=>container.classList.add('light'));
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
	style: `mapbox://styles/mapbox/${light?'light':'dark'}-v10?optimize=true`,
	center: [4.94442925, 52.31300579],//Adam Arena
	zoom: 14.3,
	bearing: 0,
	pitch: 45,
	hash: true
});

const threedee = new Mapbox3DTiles.Mapbox3DTilesLayer({
    id: 'maquette',
    dracoDecoderPath: "https://www.gstatic.com/draco/versioned/decoders/1.4.1/",
    tilesets: [
        {
            id: 'buildings',
        	url: 'https://fileserv.beta.geodan.nl/b3dm/buildingtiles_3594_3857/tileset.json',
            horizonClip: false,
            castShadow: false,
            receiveShadow: true,
        },
		{
            id: 'kabels',
        	url: 'https://fileserv.beta.geodan.nl/b3dm/amsterdam_kabels/tileset.json',
            horizonClip: false,
            castShadow: false,
            receiveShadow: true,
        },
		{
            id: 'kabels',
        	url: '		https://fileserv.beta.geodan.nl/i3dm/dev/zuidas/put/tileset.json',
            horizonClip: false,
            castShadow: false,
            receiveShadow: true,
        }
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


map.on('mousemove', (event)=>{
	let infoElement = document.querySelector('#info');
	let features = map.queryRenderedFeatures(event.point, {outline: true, outlineColor: 0xff0000});
	if (features.length) {
		infoElement.innerHTML = 
			features.map(feature=>
				`Layer: ${feature.layer.id}<br>
					${Object.entries(feature.properties).map(entry=>`<b>${entry[0]}:</b>${entry[1]}`).join('<br>\n')}
			`).join('<hr>\n')
	} else {
		infoElement.innerHTML = "Hover map objects for info";
	}
})
