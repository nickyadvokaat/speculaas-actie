import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vue-vendor',
              test: /node_modules[\\/](vue|@vue|vue-router)[\\/]/,
              priority: 3,
            },
            {
              name: 'primevue',
              test: /node_modules[\\/](primevue|@primeuix|primeicons)[\\/]/,
              priority: 2,
              maxSize: 300_000,
            },
            {
              name: 'supabase',
              test: /node_modules[\\/]@supabase[\\/]/,
              priority: 2,
            },
          ],
        },
      },
    },
  },
})
