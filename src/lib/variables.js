import { CALOR, FRIO } from './colores.js';
import { formatearNumero } from './formato.js';

// Configuración de cada variable mostrable en el mapa: de dónde sale el
// PMTiles (generado por scripts/generar_pmtiles.py) y su source-layer, el
// dominio de la escala de color, qué polo es cada color, y cómo se
// etiquetan/formatean sus valores en panel, leyenda, tooltip y popup.
export const VARIABLES = {
	temperatura: {
		pmtiles: '/temperatura.pmtiles',
		sourceLayer: 'temperatura',
		dominio: 5,
		colorNeg: FRIO,
		colorPos: CALOR,
		unidad: '°C',
		etiqueta: 'Temperatura',
		extremoNeg: 'Más frío',
		extremoPos: 'Más calor',
		tituloValor: 'Temperatura máxima',
		tituloHistorico: 'Media histórica de máximas',
		fmt: (v) => `${formatearNumero(v, 1)} °C`,
		fmtDif: (d) => `${d > 0 ? '+' : ''}${formatearNumero(d, 1)} °C`
	},
	lluvia: {
		pmtiles: '/lluvia.pmtiles',
		sourceLayer: 'lluvia',
		dominio: 4,
		colorNeg: CALOR,
		colorPos: FRIO,
		unidad: 'mm',
		etiqueta: 'Lluvia',
		extremoNeg: 'Más seco',
		extremoPos: 'Más lluvia',
		tituloValor: 'Precipitación',
		tituloHistorico: 'Media histórica diaria',
		fmt: (v) => `${formatearNumero(v, 1)} mm`,
		fmtDif: (d) => `${d > 0 ? '+' : ''}${formatearNumero(d, 1)} mm`
	}
};
