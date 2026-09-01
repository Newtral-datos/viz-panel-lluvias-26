import { colorDePunto, colorConAlpha } from './colores.js';
import { COLORES_AVISO } from './avisos.js';
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

/** "28 ago 12:00" a partir de un datetime CAP con offset (ej. "2026-08-28T12:00:00+02:00"). */
function fechaCorta(iso) {
	if (!iso) return null;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	const texto = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	return texto.replace('.', '');
}

function vigenciaTexto(desde, hasta) {
	const d = fechaCorta(desde);
	const h = fechaCorta(hasta);
	if (d && h) return `${d} – ${h}`;
	return d || h || null;
}

// <severity> del CAP viene en inglés (estándar OASIS: Minor/Moderate/Severe/
// Extreme) — Minor no llega aquí (03_avisos.py ya lo descarta, no es un aviso
// real de zona), así que solo hace falta traducir estas tres.
const SEVERIDAD_ES = { Moderate: 'Moderado', Severe: 'Severo', Extreme: 'Extremo' };

/** Un aviso activo dentro del popup de zona: fenómeno + severidad, parámetro/probabilidad
 * si vienen informados, y vigencia. Varias zonas pueden tener varios avisos a la vez
 * (ej. lluvias amarillo + viento naranja) — por eso esto es una lista, no un valor único. */
function bloqueAviso(a) {
	const color = COLORES_AVISO[a.color] ?? COLORES_AVISO.verde;
	const parametro = a.parametro_valor
		? `${a.parametro_nombre ? a.parametro_nombre + ': ' : ''}${a.parametro_valor}`
		: null;
	const vigencia = vigenciaTexto(a.efectivo_desde, a.efectivo_hasta);
	const severidad = SEVERIDAD_ES[a.severidad] ?? a.severidad ?? '';
	return `
		<div class="popup-aviso" style="border-color:${color}">
			<div class="popup-aviso-cabecera">
				<span class="popup-badge" style="background:${colorConAlpha(color, 0.14)};color:${color}">${severidad}</span>
				<strong>${a.evento}</strong>
			</div>
			${parametro ? `<p class="popup-aviso-dato">${parametro}${a.probabilidad ? ` | prob. ${a.probabilidad}` : ''}</p>` : ''}
			${vigencia ? `<p class="popup-aviso-vigencia">${vigencia}</p>` : ''}
		</div>`;
}

/**
 * Popup de una zona Meteoalerta: lista TODOS sus avisos activos a la vez (una zona
 * puede tener varios avisos de fenómenos distintos simultáneos), no solo el más
 * grave — el más grave es el que decide el color de relleno de la zona, ver
 * avisos.js::colorAvisoExpr.
 */
export function construirPopupAvisosHTML(propiedades) {
	const p = propiedades;
	const avisos = p.avisos_json ? JSON.parse(p.avisos_json) : [];
	const color = COLORES_AVISO[p.color] ?? COLORES_AVISO.verde;

	const cuerpo =
		avisos.length > 0
			? avisos.map(bloqueAviso).join('')
			: '<p class="popup-sin-historico">Sin aviso activo en esta zona.</p>';

	return `
		<div class="popup">
			<div class="popup-header">
				<strong class="popup-nombre">${p.nom_z}</strong>
				<div class="popup-header-sub">
					<span class="popup-sub">${p.nom_prov}</span>
					<span class="popup-badge" style="background:${colorConAlpha(color, 0.14)};color:${color}">${p.color}</span>
				</div>
			</div>
			${cuerpo}
		</div>`;
}
