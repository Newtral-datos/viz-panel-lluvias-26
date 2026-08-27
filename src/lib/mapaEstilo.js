export const CARTO_STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

/** El estilo de CARTO fija el texto de los topónimos a {name_en}; se
 * sustituye por {name} para que salgan en castellano (esquema OpenMapTiles)
 * en vez de en inglés — mismo truco que TEMAS/Incendios en Europa/mapa. */
export function localizarEtiquetasCarto(estilo) {
	const layers = estilo.layers.map((layer) => {
		const textField = layer.layout?.['text-field'];
		const localizado =
			textField === undefined ? undefined : JSON.parse(JSON.stringify(textField).replaceAll('name_en', 'name'));
		return {
			...layer,
			...(localizado !== undefined && { layout: { ...layer.layout, 'text-field': localizado } })
		};
	});
	return { ...estilo, layers };
}

/** Control de mapa (mismo IControl que NavigationControl) para volver al encuadre inicial. */
export function crearControlRestablecerVista(map, center, zoom) {
	let container;
	return {
		onAdd() {
			container = document.createElement('div');
			container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'reset-view-ctrl';
			button.setAttribute('aria-label', 'Restablecer vista');
			button.title = 'Restablecer vista';
			button.innerHTML =
				'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
				'<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>' +
				'<path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
			button.addEventListener('click', () => map.easeTo({ center, zoom, duration: 500 }));
			container.appendChild(button);
			return container;
		},
		onRemove() {
			container?.parentNode?.removeChild(container);
		}
	};
}
