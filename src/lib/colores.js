// Paleta corporativa (copiada de TEMAS/Incendios en Europa/mapa) + los dos
// polos de la escala divergente propios de este mapa (calor/sequía en el
// mismo rojo de la referencia, frío/humedad en un azul a juego con el resto
// del sistema cálido en vez de un azul genérico de pantalla).
export const CALOR = '#ff2a01';
export const FRIO = '#0072ce';
export const GRIS_MID = '#e7e2d2'; // = --card-2, neutro cálido en vez de gris frío
export const GRIS_SIN = '#a39c8a';

/** Expresión MapLibre: color divergente por `diferencia`, gris si no hay histórico. */
export function colorExpr(cfg) {
	return [
		'case',
		['==', ['get', 'con_historico'], false],
		GRIS_SIN,
		['interpolate', ['linear'], ['get', 'diferencia'], -cfg.dominio, cfg.colorNeg, 0, GRIS_MID, cfg.dominio, cfg.colorPos]
	];
}

/** Mismo degradado que colorExpr, pero como función JS pura (para la leyenda). */
export function colorEnPaso(t, cfg) {
	const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
	const mid = hex(GRIS_MID);
	const target = hex(t >= 0 ? cfg.colorPos : cfg.colorNeg);
	const at = Math.abs(t);
	const rgb = mid.map((m, i) => Math.round(m + (target[i] - m) * at));
	return `rgb(${rgb.join(',')})`;
}

/** Color de un punto concreto, coherente con colorExpr (para popups/tooltips en JS). */
export function colorDePunto(propiedades, cfg) {
	if (!propiedades.con_historico) return GRIS_SIN;
	return propiedades.diferencia >= 0 ? cfg.colorPos : cfg.colorNeg;
}

/** Hex a rgba(), para fondos translúcidos (ej. la píldora de categoría del popup). */
export function colorConAlpha(hex, alpha) {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
