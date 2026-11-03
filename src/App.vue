<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authState, signOut } from './stores/auth'
import { useToast } from 'primevue/usetoast'
import { isSupabaseConfigured } from './lib/supabase'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const isConfigured = isSupabaseConfigured
const baseUrl = import.meta.env.BASE_URL
const isPastDeadline = computed(() => new Date() > new Date('2026-11-12T23:59:59'))
const routeTitle = computed(() => {
  if (route.name === 'order') return 'Bestelling invoeren'
  if (route.name === 'leaderboard') return 'Verkopersranglijst'
  if (route.name === 'commission') return 'Commissieoverzicht'
  if (route.name === 'profile') return 'Verkopersprofiel'
  return 'Clubactie 2026'
})

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
      <RouterLink class="brand" to="/" aria-label="De Linge PCG actie - startpagina">
        <img class="brand-logo" :src="`${baseUrl}logo.png`" alt="" />
        <span class="brand-copy">
          <strong>De Linge PCG</strong>
          <small>Speculaasactie</small>
        </span>
      </RouterLink>
      <nav class="main-nav" aria-label="Hoofdnavigatie">
        <RouterLink to="/bestellen" v-if="authState.user">Bestellen</RouterLink>
        <RouterLink to="/ranglijst">Ranglijst</RouterLink>
        <RouterLink
          to="/commissie"
          v-if="authState.profile?.role === 'admin'"
        >Commissie</RouterLink>
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
        <RouterLink v-else class="login-link" to="/">Inloggen</RouterLink>
      </div>
    </header>

    <div v-if="!isConfigured" class="setup-notice">
      <i class="pi pi-info-circle" aria-hidden="true"></i>
      De Supabase-koppeling moet nog worden ingesteld voordat aanmelden en
      bestellingen opslaan werken.
    </div>
    <div v-else-if="isPastDeadline" class="deadline-notice">
      De uiterste inleverdatum van 12 november 2026 is voorbij. Je kunt nog wel
      een bestelling invoeren.
    </div>

    <main class="page-content">
      <div class="page-heading" v-if="route.name !== 'home'">
        <div>
          <p class="eyebrow">De Linge PCG · Speculaasactie 2026</p>
          <h1>{{ routeTitle }}</h1>
        </div>
        <span class="heading-season">2026</span>
      </div>
      <RouterView />
    </main>

    <footer class="site-footer">
      <span>Met elkaar voor De Linge PCG</span>
      <span>Actie sluit op 12 november 2026</span>
    </footer>
    <Toast position="top-right" />
  </div>
</template>
