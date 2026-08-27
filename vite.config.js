import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// Nombre del repo en GitHub Pages (viz-panel-lluvias-26): en producción las
// rutas de assets deben ir bajo /viz-panel-lluvias-26/, no en la raíz, porque
// GitHub Pages sirve el proyecto en ese subpath.
const REPO_NAME = 'viz-panel-lluvias-26'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  base: process.env.NODE_ENV === 'production' ? `/${REPO_NAME}/` : '/',
  // maplibre-gl bundla su propio web worker; el prebundler de Vite no lo
  // resuelve bien si se deja optimizar (falla en silencio: el basemap raster
  // carga pero las capas GeoJSON, que dependen del worker, no se llegan a pintar).
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
})
