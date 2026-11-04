import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import ToastService from 'primevue/toastservice'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import Divider from 'primevue/divider'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import Toast from 'primevue/toast'
import 'primeicons/primeicons.css'
import App from './App.vue'
import router from './router'
import { authState, initializeAuth } from './stores/auth'
import { isSupabaseConfigured } from './lib/supabase'
import './styles.css'

async function startApp(): Promise<void> {
  const shouldOpenProfile = new URLSearchParams(window.location.search).get('auth') === 'profile'
  await initializeAuth()
  const app = createApp(App)
  app.use(router)
  app.use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        prefix: 'p',
        darkModeSelector: '.dark-mode',
        cssLayer: false,
      },
    },
  })
  app.use(ToastService)
  app.provide('supabaseConfigured', isSupabaseConfigured)
  app.component('Button', Button)
  app.component('Card', Card)
  app.component('Column', Column)
  app.component('DataTable', DataTable)
  app.component('Dialog', Dialog)
  app.component('Divider', Divider)
  app.component('InputNumber', InputNumber)
  app.component('InputText', InputText)
  app.component('Message', Message)
  app.component('Select', Select)
  app.component('Tag', Tag)
  app.component('Textarea', Textarea)
  app.component('Toast', Toast)
  await router.isReady()
  if (shouldOpenProfile) {
    if (authState.user && !authState.profile?.display_name) {
      await router.replace('/profiel')
    }
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.hash}`,
    )
  }
  app.mount('#app')
}

void startApp()
