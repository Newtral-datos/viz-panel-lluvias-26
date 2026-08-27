import { colorDePunto, colorConAlpha } from './colores.js';
import { formatearNumero } from './formato.js';

function fila(etiqueta, valor, color) {
	return `<div><dt>${etiqueta}</dt><dd${color ? ` style="color:${color}"` : ''}>${valor}</dd></div>`;
}

/** Mes en español (capitalizado) de una fecha "YYYY-MM-DD". Se calcula por
 * estación en vez de una vez para todo el mapa: lluvia y temperatura prueban
 * su "día más reciente con datos" por separado, así que pueden ir por meses
 * distintos, y hasta dentro del mismo dominio no hay garantía de que todas
 * las estaciones compartan fecha. */
function mesDeFecha(fechaISO) {
	if (!fechaISO) return null;
	const mes = new Date(`${fechaISO}T00:00:00`).toLocaleDateString('es-ES', { month: 'long' });
	return mes.charAt(0).toUpperCase() + mes.slice(1);
}

/** Contenido corto del tooltip al pasar el ratón (una línea, sin abrir popup). */
export function construirTooltipHTML(cfg, propiedades) {
	const resumen = propiedades.con_historico ? cfg.fmtDif(propiedades.diferencia) : 'sin histórico';
	return `<strong>${propiedades.nombre}</strong> | ${resumen}`;
}

/**
 * Contenido completo del popup al hacer clic en una estación: dato de hoy,
 * comparación con el histórico (con el mes de referencia explícito, ya que
 * AEMET puede publicar con retraso y no siempre es el mes en curso), altitud
 * y categoría de la estación.
 */
export function construirPopupHTML({ cfg, propiedades: p }) {
	const color = colorDePunto(p, cfg);
	const mesReferencia = mesDeFecha(p.fecha);

	const badge = p.categoria
		? `<span class="popup-badge" style="background:${colorConAlpha(color, 0.14)};color:${color}">${p.categoria}</span>`
		: '';

	const filaAltitud = p.altitud != null ? fila('Altitud', `${formatearNumero(p.altitud, 0)} m`) : '';
	const filaFecha = p.fecha_txt ? fila('Fecha del dato', p.fecha_txt) : '';

	const bloqueHistorico = p.con_historico
		? `
			<dl class="popup-rows">
				${fila(cfg.tituloHistorico, cfg.fmt(p.historico))}
				${fila('Diferencia', cfg.fmtDif(p.diferencia), color)}
				${filaAltitud}
			</dl>
			${mesReferencia ? `<p class="popup-mes">Media histórica de <strong>${mesReferencia}</strong> | periodo de referencia 1991-2020</p>` : ''}`
		: `
			<dl class="popup-rows">${filaAltitud}</dl>
			<p class="popup-sin-historico">Esta estación no tiene normal climatológica 1991-2020 publicada por AEMET, así que no hay con qué comparar el dato de hoy.</p>`;

	// El nombre va solo en su propia línea (deja aire arriba, bajo el botón de
	// cerrar de MapLibre); la píldora de categoría se coloca junto a la
	// provincia, una línea más abajo, para que nunca choque con esa X.
	return `
		<div class="popup">
			<div class="popup-header">
				<strong class="popup-nombre">${p.nombre}</strong>
				<div class="popup-header-sub">
					<span class="popup-sub">${p.provincia}</span>
					${badge}
				</div>
			</div>
			<dl class="popup-rows popup-rows--principal">
				${filaFecha}
				${fila(cfg.tituloValor, cfg.fmt(p.valor))}
			</dl>
			${bloqueHistorico}
		</div>`;
}
