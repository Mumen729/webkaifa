import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Allow access via tunnel/LAN hostnames (e.g. *.trycloudflare.com, LAN IPs)
    allowedHosts: true,
    watch: {
      // ignore atomic-write temp dirs (".Foo.jsx.<pid>.<uuid>.tmpdir/") that
      // crash chokidar on Windows with EBUSY
      ignored: ['**/*.tmpdir/**', '**/*.tmp']
    },
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000'
    }
  }
})
