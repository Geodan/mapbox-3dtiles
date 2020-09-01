import Mapbox3DTilesLayer from "./modules/Mapbox3DTiles.mjs";

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

document.querySelector('#debug').addEventListener('change', function(e){
	window.location=`./?debug=${e.target.checked}&light=${light}${window.location.hash}`
});
document.querySelector('#light').addEventListener('change', function(e){
	window.location=`./?debug=${debug}&light=${e.target.checked}${window.location.hash}`
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



map.on('style.load', function() {

	const i3dm_test = new Mapbox3DTilesLayer( { 
		id: 'i3dm_test', 
		url: './data/i3dm_test/tileset.json', 
		color: 0xffffff, 
		opacity: 1
	} );
	map.addLayer(i3dm_test);
	
	const jca = new Mapbox3DTilesLayer( {
		id: 'jca',
		url: 'https://beta.geodan.nl/data/buildingtiles_jca_FurnitureSystems_3857/tileset.json'
	});
	map.addLayer(jca);
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
