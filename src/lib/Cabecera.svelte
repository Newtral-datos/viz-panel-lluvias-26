<script>
	import { onMount } from 'svelte';
	import { CALOR, FRIO } from './colores.js';
	import { COLORES_AVISO } from './avisos.js';
	import { formatearNumero } from './formato.js';

	let datos = $state(null);
	let error = $state(false);

	onMount(async () => {
		try {
			const r = await fetch(`${import.meta.env.BASE_URL}estadisticas.json`);
			if (!r.ok) throw new Error('sin datos');
			datos = await r.json();
		} catch {
			error = true;
		}
	});

	function formatearFechaLarga(fechaISO) {
		if (!fechaISO) return '';
		return new Date(`${fechaISO}T00:00:00`).toLocaleDateString('es-ES', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	// Mismo criterio que la escala de lluvia del mapa (variables.js: colorNeg=CALOR,
	// colorPos=FRIO): diferencia positiva = más húmedo de lo normal = azul;
	// negativa = más seco = rojo.
	const colorDiferencia = $derived(
		!datos || datos.diferencia_nacional == null
			? 'var(--ink-muted)'
			: datos.diferencia_nacional >= 0
				? FRIO
				: CALOR
	);
	const colorAvisos = $derived(datos?.zonas_en_aviso ? COLORES_AVISO.naranja : 'var(--ink-muted)');
</script>

<div class="cabecera-root">
	{#if error}
		<p class="mensaje">No se han podido cargar los datos.</p>
	{:else if !datos}
		<p class="mensaje">Cargando…</p>
	{:else}
		<div class="tarjeta">
			<div class="stat">
				<span class="stat-label">Lluvia media hoy</span>
				<span class="stat-valor">
					{datos.media_lluvia_nacional != null ? `${formatearNumero(datos.media_lluvia_nacional, 1)} mm` : '—'}
				</span>
			</div>
			<div class="stat-sep"></div>
			<div class="stat">
				<span class="stat-label">Diferencia con el histórico</span>
				<span class="stat-valor" style="color:{colorDiferencia}">
					{#if datos.diferencia_nacional != null}
						{datos.diferencia_nacional > 0 ? '+' : ''}{formatearNumero(datos.diferencia_nacional, 1)} mm
					{:else}
						—
					{/if}
				</span>
			</div>
			<div class="stat-sep"></div>
			<div class="stat">
				<span class="stat-label">Regiones en aviso</span>
				<span class="stat-valor" style="color:{colorAvisos}">
					{datos.zonas_en_aviso != null ? datos.zonas_en_aviso : '—'}
				</span>
			</div>
			{#if datos.zonas_amarillo != null}
				<div class="stat-sep"></div>
				<div class="stat">
					<span class="stat-label" style="color:{COLORES_AVISO.amarillo}">En amarillo</span>
					<span class="stat-valor" style="color:{COLORES_AVISO.amarillo}">{datos.zonas_amarillo}</span>
				</div>
				<div class="stat-sep"></div>
				<div class="stat">
					<span class="stat-label" style="color:{COLORES_AVISO.naranja}">En naranja</span>
					<span class="stat-valor" style="color:{COLORES_AVISO.naranja}">{datos.zonas_naranja}</span>
				</div>
				<div class="stat-sep"></div>
				<div class="stat">
					<span class="stat-label" style="color:{COLORES_AVISO.rojo}">En rojo</span>
					<span class="stat-valor" style="color:{COLORES_AVISO.rojo}">{datos.zonas_rojo}</span>
				</div>
			{/if}
		</div>
		{#if datos.fecha_actualizacion}
			<p class="pie">Datos AEMET actualizados el {formatearFechaLarga(datos.fecha_actualizacion)}</p>
		{/if}
	{/if}
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
		--font: 'Helvetica Neue', Helvetica, Arial, sans-serif;
		--font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
	}
	:global(html),
	:global(body),
	:global(#app) {
		overflow: visible;
		background: #fff;
	}

	.cabecera-root {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		background: #fff;
		font-family: var(--font);
		padding: 24px;
		box-sizing: border-box;
	}
	.mensaje {
		color: var(--ink-muted);
		font-size: 14px;
	}
	/* Todo en una sola fila (pedido expreso) — en pantallas estrechas los stats
	   pasan a envolver en varias líneas (flex-wrap) en vez de apilarse en una
	   columna larga: mantiene grupos de "etiqueta + valor" juntos y legibles
	   sin que la cabecera ocupe media pantalla de alto en móvil. */
	.tarjeta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: var(--shadow);
		padding: 18px 28px;
		gap: 20px 28px;
		max-width: 100%;
	}
	.stat {
		display: flex;
		flex-direction: column;
		gap: 6px;
		align-items: center;
		text-align: center;
	}
	.stat-label {
		font-size: 10.5px;
		font-weight: 700;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: var(--ink-muted);
		white-space: nowrap;
	}
	.stat-valor {
		font-family: var(--font-mono);
		font-size: 24px;
		font-weight: 700;
		color: var(--ink);
		white-space: nowrap;
	}
	.stat-sep {
		width: 1px;
		align-self: stretch;
		background: var(--border);
	}
	.pie {
		margin: 0;
		font-size: 11px;
		color: var(--ink-muted);
		text-align: center;
	}

	@media (max-width: 640px) {
		.cabecera-root {
			padding: 16px;
		}
		.tarjeta {
			padding: 16px 18px;
			gap: 14px 18px;
		}
		.stat-valor {
			font-size: 19px;
		}
		/* Los separadores verticales no funcionan bien contra un flex-wrap donde
		   los stats saltan de línea de forma impredecible según el ancho — se
		   ocultan y el espacio del gap ya separa visualmente cada grupo. */
		.stat-sep {
			display: none;
		}
	}
</style>
