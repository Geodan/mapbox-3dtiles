import { DRACOLoader } from '../node_modules/three/examples/jsm/loaders/DRACOLoader.js';

mapboxgl.accessToken = apiKeys.mapboxAccessToken;
const urlParams = new URLSearchParams(window.location.search);

Mapbox3DTiles.DEBUG = debug;

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
    //style: `mapbox://styles/mapbox/${light?'light':'dark'}-v10?optimize=true`,
    style: 'https://fileserv.beta.geodan.nl/mapbox/styles/basiskaart_style-dev.json',
    //center: [4.94442925, 52.31300579],//Adam Arena
    //center: [5.11833, 52.08574],//Utrecht
    //center: [4.48630346, 51.90492609],//Rdam Katendrecht
    center: [4.90365, 52.35052], //Heveadorp
    zoom: 14,
    bearing: 0,
    pitch: 40,
    hash: true,
    antialias: true
});



map.on('style.load', function() {
	//map.showTileBoundaries = true;

	const buildingstyle = {
		color: 0xffffff,
		opacity: 1,
		colorAttribute: 'id',
	};

	var dracoLoader = new DRACOLoader();
	dracoLoader.setDecoderPath('/assets/draco/');
    
	const compressedBuildings = new Mapbox3DTiles.Mapbox3DTilesLayer({
        id: 'maquette-compressed',
        url: 'https://beta.geodan.nl/data/buildingtiles_nl_compressed_3857/tileset.json',
        style: buildingstyle,
        dracoLoader: dracoLoader
    });
	map.addLayer(compressedBuildings);
	
	const nl_niveau_3 = new Mapbox3DTiles.Mapbox3DTilesLayer({
        id: 'nl_niveau_3',
        url: 'https://fileserv.beta.geodan.nl/i3dm/nl_niveau_3/tileset.json',
        dracoLoader: dracoLoader
    });
	map.addLayer(nl_niveau_3);

	const nl_niveau_2 = new Mapbox3DTiles.Mapbox3DTilesLayer({
        id: 'nl_niveau_2',
        url: 'https://fileserv.beta.geodan.nl/i3dm/nl_niveau_2/tileset.json',
        dracoLoader: dracoLoader
    });
	map.addLayer(nl_niveau_2);

	const nl_niveau_1 = new Mapbox3DTiles.Mapbox3DTilesLayer({
		id: 'nl_niveau_1',
		url: 'https://fileserv.beta.geodan.nl/i3dm/nl_niveau_1/tileset.json',
        dracoLoader: dracoLoader
	});
	map.addLayer(nl_niveau_1);

	compressedBuildings.setHismphereIntensity(0.75);
	compressedBuildings.setShadowOpacity(0.15);
	compressedBuildings.lights[1].position.set(85.95479335896457, -500.3727753754697, 861.5328543715947);

	nl_niveau_3.setHismphereIntensity(0.75);
	nl_niveau_3.setShadowOpacity(0.15);
	nl_niveau_3.lights[1].position.set(85.95479335896457, -500.3727753754697, 861.5328543715947);
	
	nl_niveau_2.setHismphereIntensity(0.75);
	nl_niveau_2.setShadowOpacity(0.15);
	nl_niveau_2.lights[1].position.set(85.95479335896457, -500.3727753754697, 861.5328543715947);
	
	nl_niveau_1.setHismphereIntensity(0.75);
	nl_niveau_1.setShadowOpacity(0.15);
	nl_niveau_1.lights[1].position.set(85.95479335896457, -500.3727753754697, 861.5328543715947);

	const geodan = new Mapbox3DTiles.Mapbox3DTilesLayer(
		{
			id: 'geodan',
			url: 'https://fileserv.beta.geodan.nl/i3dm/geodan_bim/tileset.json'
		});
	//map.addLayer(geodan);
	
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

map.on('click', (event)=>{
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

