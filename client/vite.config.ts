import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
// import { baseURL } from './src/lib/api'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // server: {
  //   proxy: {
  //     '/api': {
  //       target: "http://localhost:3001",
  //       changeOrigin: true,
  //     },
  //   },
  // },
})
