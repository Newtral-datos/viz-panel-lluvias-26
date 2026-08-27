<script>
	import { onMount } from 'svelte';
	import * as maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	import { colorExpr, colorEnPaso, colorDePunto } from './colores.js';
	import { VARIABLES } from './variables.js';
	import { CARTO_STYLE_URL, localizarEtiquetasCarto, crearControlRestablecerVista } from './mapaEstilo.js';
	import { construirTooltipHTML, construirPopupHTML } from './popup.js';
	import { registrarProtocoloPMTiles, añadirCapaProvincias } from './provincias.js';

	const MAP_CENTER = [-8, 35.8];
	const MAP_ZOOM = 4.75;
	const MAP_BOUNDS = [
		[-32, 20],
		[16, 50]
	];

	const METADATA_VACIA = { fecha_actualizacion: null, fecha_dato: null, retraso_dias: null, sin_historico: 0, total: 0 };

	let mapEl;
	let activa = $state('temperatura');
	let soloConHistorico = $state(true);
	let metaPorDominio = $state({ temperatura: METADATA_VACIA, lluvia: METADATA_VACIA });
	let mapaInstancia = $state(null);

	function formatearFechaLarga(fechaISO) {
		if (!fechaISO) return '';
		return new Date(`${fechaISO}T00:00:00`).toLocaleDateString('es-ES', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	onMount(() => {
		const tooltip = document.createElement('div');
		tooltip.className = 'map-tooltip';
		document.body.appendChild(tooltip);
		let popup = null;
		let map;

		(async () => {
			registrarProtocoloPMTiles(maplibregl);

			const cartoStyleRaw = await fetch(CARTO_STYLE_URL).then((r) => r.json());
			const cartoStyle = localizarEtiquetasCarto(cartoStyleRaw);

			map = new maplibregl.Map({
				container: mapEl,
				style: {
					version: 8,
					sources: cartoStyle.sources,
					sprite: cartoStyle.sprite,
					glyphs: cartoStyle.glyphs,
					layers: cartoStyle.layers
				},
				center: MAP_CENTER,
				zoom: MAP_ZOOM,
				minZoom: 3.6,
				maxZoom: 12,
				maxBounds: MAP_BOUNDS,
				attributionControl: false
			});
			mapaInstancia = map;

			map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
			map.addControl(crearControlRestablecerVista(map, MAP_CENTER, MAP_ZOOM), 'top-right');
			map.addControl(
				new maplibregl.AttributionControl({ compact: true, customAttribution: '© CARTO · AEMET' }),
				'bottom-right'
			);

			map.on('load', async () => {
				const meta = await fetch('/meta.json').then((r) => r.json()).catch(() => ({}));

				añadirCapaProvincias(map);

				if (meta?.temperatura && meta?.lluvia) metaPorDominio = meta;

				const claves = Object.keys(VARIABLES);
				claves.forEach((clave) => {
					const cfg = VARIABLES[clave];

					map.addSource(`src-${clave}`, { type: 'vector', url: `pmtiles://${cfg.pmtiles}` });

					map.addLayer({
						id: `capa-${clave}`,
						type: 'circle',
						source: `src-${clave}`,
						'source-layer': cfg.sourceLayer,
						layout: { visibility: clave === activa ? 'visible' : 'none' },
						filter: soloConHistorico ? ['==', ['get', 'con_historico'], true] : undefined,
						paint: {
							'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 3.5, 8, 6, 12, 10],
							'circle-color': colorExpr(cfg),
							'circle-opacity': 0.92,
							'circle-stroke-width': 1.2,
							'circle-stroke-color': '#494949',
							'circle-stroke-opacity': 0.8
						}
					});
				});

				claves.forEach((clave) => {
					const capa = `capa-${clave}`;
					const cfg = VARIABLES[clave];

					map.on('mousemove', capa, (e) => {
						map.getCanvas().style.cursor = 'pointer';
						const f = e.features?.[0];
						if (!f) return;
						tooltip.style.left = e.originalEvent.clientX + 14 + 'px';
						tooltip.style.top = e.originalEvent.clientY - 12 + 'px';
						tooltip.innerHTML = construirTooltipHTML(cfg, f.properties);
						tooltip.classList.add('visible');
					});
					map.on('mouseleave', capa, () => {
						map.getCanvas().style.cursor = '';
						tooltip.classList.remove('visible');
					});

					map.on('click', capa, (e) => {
						const f = e.features?.[0];
						if (!f) return;
						if (!popup) popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 10, maxWidth: '270px' });
						popup
							.setLngLat(f.geometry.coordinates)
							.setHTML(construirPopupHTML({ cfg, propiedades: f.properties }))
							.addTo(map);
						const contenido = popup.getElement()?.querySelector('.maplibregl-popup-content');
						if (contenido) contenido.style.borderColor = colorDePunto(f.properties, cfg);
					});
				});
			});
		})();

		return () => {
			tooltip.remove();
			map?.remove();
		};
	});

	$effect(() => {
		// Leer las dependencias reactivas ANTES del early-return: si `activa`/
		// `soloConHistorico` no se llegan a leer en la primera ejecución (mapa
		// aún no listo), Svelte no las registra como dependencias del efecto y
		// este no se vuelve a disparar nunca cuando cambian — los botones
		// dejan de tener efecto sobre el mapa aunque su estado visual sí cambie.
		const claveActiva = activa;
		const filtro = soloConHistorico ? ['==', ['get', 'con_historico'], true] : null;
		if (!mapaInstancia) return;
		for (const clave of Object.keys(VARIABLES)) {
			if (mapaInstancia.getLayer(`capa-${clave}`)) {
				mapaInstancia.setLayoutProperty(`capa-${clave}`, 'visibility', clave === claveActiva ? 'visible' : 'none');
				mapaInstancia.setFilter(`capa-${clave}`, filtro);
			}
		}
	});

	const cfgActiva = $derived(VARIABLES[activa]);
	const metaActiva = $derived(metaPorDominio[activa]);
	const pasosLeyenda = $derived.by(() => {
		const n = 7;
		return Array.from({ length: n }, (_, i) => -1 + (2 * i) / (n - 1));
	});
</script>

<div class="mapa-root">
	<div bind:this={mapEl} id="map"></div>

	<div class="panel">
		{#if metaActiva.fecha_actualizacion}
			<p class="panel-fecha">Actualizado el {formatearFechaLarga(metaActiva.fecha_actualizacion)}</p>
		{/if}
		<div class="segmented" role="group" aria-label="Variable a mostrar">
			{#each Object.entries(VARIABLES) as [clave, v]}
				<button class:activo={activa === clave} onclick={() => (activa = clave)} aria-pressed={activa === clave}>
					{v.etiqueta}
				</button>
			{/each}
		</div>
		<p class="panel-nota">comparado con la media 1991-2020 del mismo mes</p>

		<div class="panel-sep"></div>

		<div class="panel-toggle-row">
			<span class="panel-toggle-label">Solo con histórico</span>
			<button
				class="switch"
				class:activo={soloConHistorico}
				role="switch"
				aria-checked={soloConHistorico}
				aria-label="Mostrar solo estaciones con histórico"
				onclick={() => (soloConHistorico = !soloConHistorico)}
			></button>
		</div>

		<div class="panel-sep"></div>

		<div class="leyenda">
			<div class="leyenda-cabecera">
				<span>{cfgActiva.extremoNeg}</span>
				<span>{cfgActiva.extremoPos}</span>
			</div>
			<div class="leyenda-barra">
				{#each pasosLeyenda as t}
					<span class="leyenda-paso" style="background:{colorEnPaso(t, cfgActiva)}"></span>
				{/each}
			</div>
			<div class="leyenda-pie">
				<span class="leyenda-chip"></span>
				<span>sin histórico ({metaActiva.sin_historico}/{metaActiva.total})</span>
			</div>
		</div>

		{#if metaActiva.retraso_dias != null}
			<div class="panel-sep"></div>
			<p class="panel-pie">
				AEMET: {cfgActiva.etiqueta.toLowerCase()} con {metaActiva.retraso_dias}
				{metaActiva.retraso_dias === 1 ? 'día' : 'días'} de retraso
			</p>
		{/if}
	</div>
</div>

<style>
	:global(:root) {
		--paper: #f1efe6;
		--card: #fffdf8;
		--card-2: #e7e2d2;
		--ink: #16181a;
		--ink-muted: #6b6558;
		--border: rgba(28, 22, 10, 0.14);
		--shadow: 0 1px 0 rgba(22, 20, 14, 0.06), 0 6px 16px rgba(22, 20, 14, 0.12);
		--shadow-lg: 0 2px 0 rgba(22, 20, 14, 0.08), 0 14px 32px rgba(22, 20, 14, 0.18);
		--font: 'Helvetica Neue', Helvetica, Arial, sans-serif;
		--font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
	}

	:global(.map-tooltip) {
		position: fixed;
		z-index: 200;
		background: var(--ink);
		color: var(--card);
		font-size: 12px;
		font-weight: 600;
		font-family: var(--font);
		padding: 5px 10px;
		border-radius: 7px;
		pointer-events: none;
		white-space: nowrap;
		box-shadow: var(--shadow);
		opacity: 0;
		transition: opacity 0.1s;
	}
	:global(.map-tooltip.visible) {
		opacity: 1;
	}

	:global(.maplibregl-ctrl-group) {
		border-radius: 4px !important;
		overflow: hidden;
		box-shadow: var(--shadow) !important;
		border: 1px solid var(--border);
	}
	:global(.maplibregl-ctrl-attrib) {
		font-family: var(--font);
		font-size: 11px !important;
	}
	:global(.reset-view-ctrl) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 29px;
		height: 29px;
		color: #333;
		background: none;
		border: none;
		cursor: pointer;
	}
	:global(.reset-view-ctrl:hover) {
		color: #000;
	}

	:global(.maplibregl-popup-content) {
		padding: 14px 28px 14px 14px;
		border-radius: 0;
		border: 1px solid var(--border);
		background: var(--card);
		box-shadow: var(--shadow-lg);
		font-family: var(--font);
	}
	:global(.maplibregl-popup-close-button) {
		right: 6px;
		top: 6px;
		width: 20px;
		height: 20px;
		font-size: 16px;
		line-height: 1;
		color: var(--ink-muted);
		border-radius: 50%;
	}
	:global(.maplibregl-popup-close-button:hover) {
		color: var(--ink);
		background: var(--card-2);
	}
	:global(.maplibregl-popup-anchor-bottom .maplibregl-popup-tip) {
		border-top-color: var(--card);
	}
	:global(.maplibregl-popup-anchor-top .maplibregl-popup-tip) {
		border-bottom-color: var(--card);
	}
	:global(.maplibregl-popup-anchor-left .maplibregl-popup-tip) {
		border-right-color: var(--card);
	}
	:global(.maplibregl-popup-anchor-right .maplibregl-popup-tip) {
		border-left-color: var(--card);
	}

	:global(.popup) {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 195px;
		color: var(--ink);
	}
	:global(.popup-header) {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	:global(.popup-nombre) {
		font-size: 14.5px;
		font-weight: 700;
		line-height: 1.3;
	}
	:global(.popup-header-sub) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	:global(.popup-badge) {
		flex-shrink: 0;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.02em;
		padding: 2px 7px;
		border-radius: 0;
		white-space: nowrap;
	}
	:global(.popup-sub) {
		font-size: 12px;
		color: var(--ink-muted);
	}
	:global(.popup-rows) {
		display: flex;
		flex-direction: column;
		gap: 5px;
		margin: 0;
		padding-top: 8px;
		border-top: 1px solid var(--border);
	}
	:global(.popup-rows--principal) {
		border-top: none;
		padding-top: 0;
	}
	:global(.popup-rows > div) {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 14px;
	}
	:global(.popup-rows dt) {
		font-size: 10.5px;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: var(--ink-muted);
	}
	:global(.popup-rows dd) {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 600;
		color: var(--ink);
		text-align: right;
	}
	:global(.popup-mes) {
		margin: 2px 0 0;
		font-size: 10.5px;
		color: var(--ink-muted);
		line-height: 1.4;
	}
	:global(.popup-sin-historico) {
		margin: 4px 0 0;
		font-size: 11.5px;
		color: var(--ink-muted);
		font-style: italic;
		line-height: 1.4;
	}

	.mapa-root {
		position: relative;
		width: 100vw;
		height: 100vh;
		font-family: var(--font);
		background: var(--paper);
	}
	#map {
		position: absolute;
		inset: 0;
	}

	.panel {
		position: absolute;
		top: 16px;
		left: 16px;
		z-index: 5;
		width: 220px;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--card);
		box-shadow: var(--shadow);
		padding: 14px;
	}
	.panel-fecha {
		margin: 0 0 8px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: var(--ink);
	}
	.segmented {
		display: flex;
		background: var(--card-2);
		border-radius: 8px;
		padding: 3px;
		gap: 2px;
	}
	.segmented button {
		flex: 1;
		border: none;
		background: transparent;
		padding: 7px 0;
		font-size: 12.5px;
		font-weight: 700;
		font-family: var(--font);
		color: var(--ink-muted);
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}
	.segmented button.activo {
		background: var(--ink);
		color: var(--card);
	}
	.panel-nota {
		margin: 8px 2px 0;
		font-size: 10.5px;
		color: var(--ink-muted);
		line-height: 1.35;
	}
	.panel-pie {
		margin: 0 2px;
		font-size: 10.5px;
		color: var(--ink-muted);
		line-height: 1.35;
	}
	.panel-sep {
		height: 1px;
		background: var(--border);
		margin: 11px 0 9px;
	}
	.panel-toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}
	.panel-toggle-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--ink);
	}
	.switch {
		width: 32px;
		height: 18px;
		border-radius: 999px;
		background: var(--card-2);
		border: 1px solid var(--border);
		cursor: pointer;
		position: relative;
		flex-shrink: 0;
		transition: background 0.2s;
	}
	.switch::after {
		content: '';
		position: absolute;
		top: 1px;
		left: 1px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--card);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
		transition: transform 0.2s;
	}
	.switch.activo {
		background: var(--ink);
	}
	.switch.activo::after {
		transform: translateX(14px);
		background: var(--card);
	}

	.leyenda-cabecera {
		display: flex;
		justify-content: space-between;
		font-size: 10.5px;
		font-weight: 700;
		color: var(--ink-muted);
		margin-bottom: 6px;
	}
	.leyenda-barra {
		display: flex;
		height: 10px;
		border-radius: 5px;
		overflow: hidden;
		border: 1px solid var(--border);
	}
	.leyenda-paso {
		flex: 1;
	}
	.leyenda-pie {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 9px;
		font-size: 10.5px;
		font-family: var(--font-mono);
		color: var(--ink-muted);
	}
	.leyenda-chip {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
		background: #a39c8a;
	}

	@media (max-width: 640px) {
		.panel {
			width: calc(100vw - 32px);
		}
	}
</style>
