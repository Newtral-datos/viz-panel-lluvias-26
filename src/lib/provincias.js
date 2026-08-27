import { Protocol } from 'pmtiles';

const URL = 'pmtiles://spain_provincias.pmtiles';
const SOURCE_LAYER = 'limites_spain';
const LINE_COLOR = '#494949';

/** Registra el protocolo pmtiles:// en MapLibre. */
export function registrarProtocoloPMTiles(maplibregl) {
	const protocol = new Protocol();
	maplibregl.addProtocol('pmtiles', protocol.tile);
}

/** Límites de provincias (spain_provincias.pmtiles): solo líneas, sin relleno. */
export function añadirCapaProvincias(map, beforeId) {
	map.addSource('provincias', { type: 'vector', url: URL });
	map.addLayer(
		{
			id: 'provincias-line',
			type: 'line',
			source: 'provincias',
			'source-layer': SOURCE_LAYER,
			paint: { 'line-color': LINE_COLOR, 'line-width': 1, 'line-opacity': 0.6 }
		},
		beforeId
	);
}
