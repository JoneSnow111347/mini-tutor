import { createSSRApp } from 'vue'
import App from './App.vue'
import { initStore } from './store/index.js'

export function createApp() {
  const app = createSSRApp(App)
  initStore()
  return { app }
}
