import { mount } from 'svelte'
import './app.css'
import CabeceraApp from './CabeceraApp.svelte'

const app = mount(CabeceraApp, {
  target: document.getElementById('app'),
})

export default app
