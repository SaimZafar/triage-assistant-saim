import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend port is Saim's choice. Change VITE_PROXY_TARGET in .env if it is not 8000.
const target = process.env.VITE_PROXY_TARGET || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  // fs.allow lets ?mock read ../problem_c_data for the evidence drawer without a backend
  server: { proxy: { '/api': target }, fs: { allow: ['..'] } }
})
