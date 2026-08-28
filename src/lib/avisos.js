import { CALOR } from './colores.js';

// Paleta de severidad Meteoalerta: categórica (no divergente como lluvia/temperatura),
// así que va aparte de colores.js. rojo reutiliza CALOR (ya es "el mismo rojo de la
// referencia" en todo el sistema); naranja/amarillo/verde son tonos cálidos a juego,
// no los saturados de pantalla de un semáforo genérico.
export const COLORES_AVISO = {
	rojo: CALOR,
	naranja: '#ff7a00',
	amarillo: '#e8a900',
	verde: '#4f9d5c'
};

const URL_PMTILES = `${import.meta.env.BASE_URL}avisos.pmtiles`;
const SOURCE_LAYER = 'avisos';

/** Expresión MapLibre: relleno por el color de severidad ya resuelto en el backend
 * (scripts/03_avisos.py), el más grave de los avisos activos de la zona. */
export function colorAvisoExpr() {
	return [
		'match',
		['get', 'color'],
		'rojo', COLORES_AVISO.rojo,
		'naranja', COLORES_AVISO.naranja,
		'amarillo', COLORES_AVISO.amarillo,
		COLORES_AVISO.verde // por defecto/verde
	];
}

/** Zonas Meteoalerta: relleno por severidad + borde sutil, siempre visibles (incluso
 * en verde, sin aviso) — no es una capa que se pueda ocultar con un toggle, a
 * diferencia de "solo con histórico" en lluvia/temperatura. Si scripts/03_avisos.py
 * todavía no se ha ejecutado, avisos.pmtiles no existe y la fuente simplemente no
 * pinta nada (404 silencioso para MapLibre), sin romper el resto del mapa. */
export function añadirCapaAvisos(map) {
	map.addSource('src-avisos', { type: 'vector', url: `pmtiles://${URL_PMTILES}` });
	map.addLayer({
		id: 'capa-avisos-relleno',
		type: 'fill',
		source: 'src-avisos',
		'source-layer': SOURCE_LAYER,
		paint: {
			'fill-color': colorAvisoExpr(),
			'fill-opacity': ['match', ['get', 'color'], 'verde', 0.08, 0.4]
		}
	});
	map.addLayer({
		id: 'capa-avisos-borde',
		type: 'line',
		source: 'src-avisos',
		'source-layer': SOURCE_LAYER,
		paint: { 'line-color': '#494949', 'line-width': 0.6, 'line-opacity': 0.35 }
	});
}
