<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authState, signOut } from './stores/auth'
import { useToast } from 'primevue/usetoast'
import { isSupabaseConfigured } from './lib/supabase'
import { areOrdersClosed } from './lib/campaign'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const isConfigured = isSupabaseConfigured
const baseUrl = import.meta.env.BASE_URL
const currentTime = ref(Date.now())
let deadlineTimer = 0
const ordersClosed = computed(() => areOrdersClosed(new Date(currentTime.value)))
const routeTitle = computed(() => {
  if (route.name === 'order') return 'Nieuwe bestelling'
  if (route.name === 'leaderboard') return 'Verkopersranglijst'
  if (route.name === 'commission') return 'Verkoop overzicht'
  if (route.name === 'profile') return 'Verkopersprofiel'
  return 'Clubactie 2026'
})

onMounted(() => {
  deadlineTimer = window.setInterval(() => {
    currentTime.value = Date.now()
  }, 60_000)
})

onUnmounted(() => window.clearInterval(deadlineTimer))

async function logout(): Promise<void> {
  try {
    await signOut()
    await router.push('/')
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Uitloggen mislukt',
      detail: error instanceof Error ? error.message : 'Probeer het opnieuw.',
      life: 5000,
    })
  }
}
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="site-header-inner">
        <RouterLink class="brand" to="/" aria-label="De Linge/PCG actie - startpagina">
          <img class="brand-logo" :src="`${baseUrl}logo.png`" alt="" />
          <span class="brand-copy">
            <strong>De Linge/PCG</strong>
            <small>Speculaasactie</small>
          </span>
        </RouterLink>
        <nav class="main-nav" aria-label="Hoofdnavigatie">
          <RouterLink to="/bestellen" v-if="authState.user">Bestellen</RouterLink>
          <RouterLink to="/ranglijst">Ranglijst</RouterLink>
          <RouterLink
            to="/commissie"
            v-if="authState.profile?.role === 'admin'"
          >
            <span class="nav-label-desktop">Verkoop overzicht</span>
            <span class="nav-label-mobile">Verkoop</span>
          </RouterLink>
        </nav>
        <div class="header-actions">
          <span class="seller-label" v-if="authState.profile?.display_name">
            {{ authState.profile.display_name }}
          </span>
          <Button
            v-if="authState.user"
            label="Uitloggen"
            severity="secondary"
            text
            @click="logout"
          />
        </div>
      </div>
    </header>

    <div v-if="!isConfigured" class="setup-notice">
      <i class="pi pi-info-circle" aria-hidden="true"></i>
      De Supabase-koppeling moet nog worden ingesteld voordat aanmelden en
      bestellingen opslaan werken.
    </div>
    <div v-else-if="ordersClosed" class="deadline-notice">
      Nieuwe bestellingen invoeren is sinds 12 november 2026 gesloten.
    </div>

    <main class="page-content">
      <div class="page-heading" v-if="route.name !== 'home'">
        <div>
          <p class="eyebrow">De Linge/PCG · Speculaasactie 2026</p>
          <h1>{{ routeTitle }}</h1>
        </div>
      </div>
      <RouterView />
    </main>

    <footer class="site-footer">
      <span>De lekkerste clubactie</span>
      <span>Actie sluit op 12 november 2026</span>
    </footer>
    <Toast position="top-right" />
  </div>
</template>
