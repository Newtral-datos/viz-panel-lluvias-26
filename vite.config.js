import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// Nombre del repo en GitHub Pages (viz-panel-lluvias-26): en producción las
// rutas de assets deben ir bajo /viz-panel-lluvias-26/, no en la raíz, porque
// GitHub Pages sirve el proyecto en ese subpath.
const REPO_NAME = 'viz-panel-lluvias-26'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    // maplibre-gl carga su web worker en runtime pidiendo assets/maplibre-gl-worker.mjs
    // junto al bundle principal, y ese worker a su vez importa
    // assets/maplibre-gl-shared.mjs (código compartido con el bundle principal, para no
    // duplicarlo) — los dos son necesarios, no solo el worker. En dev, Vite los sirve
    // directo desde node_modules (por eso funcionaba en local) pero en `vite build`
    // ninguno de los dos se detecta como asset ni se copia a dist/ — el resultado en
    // producción (ej. GitHub Pages) es un 404 en el worker que deja el mapa
    // completamente en blanco (ni siquiera pinta el basemap, que también depende de
    // él), sin ningún error visible en consola (el fallo ocurre dentro del propio
    // worker thread). Se copian los dos a mano.
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs',
          dest: 'assets',
          rename: { stripBase: true },
        },
        {
          src: 'node_modules/maplibre-gl/dist/maplibre-gl-shared.mjs',
          dest: 'assets',
          rename: { stripBase: true },
        },
      ],
    }),
  ],
  base: process.env.NODE_ENV === 'production' ? `/${REPO_NAME}/` : '/',
  // maplibre-gl bundla su propio web worker; el prebundler de Vite no lo
  // resuelve bien si se deja optimizar (falla en silencio: el basemap raster
  // carga pero las capas GeoJSON, que dependen del worker, no se llegan a pintar).
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
})
