<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { authState, signOut } from './stores/auth'
import { clearSales, loadSales, salesState } from './stores/sales'
import { isSupabaseConfigured } from './lib/supabase'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const baseUrl = import.meta.env.BASE_URL
const currentTime = ref(Date.now())
const mobileMenuOpen = ref(false)
const siteHeader = ref<HTMLElement | null>(null)
let clockTimer = 0
const paid = computed(() => salesState.totalCents !== null && salesState.totalCents > 0 && Number(authState.profile?.paid_total_cents ?? 0) >= salesState.totalCents)
const paymentMessage = computed(() => {
  if (paid.value) return 'We hebben je betaling ontvangen. Bedankt!'
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(currentTime.value))
  const days = Math.round((Date.UTC(2026, 10, 22) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000)
  if (days < 0) return 'De betaaltermijn is verstreken. Betaal je totaalbedrag zo snel mogelijk.'
  if (days === 0) return 'Betaal je totaalbedrag uiterlijk vandaag.'
  return `Betaal je totaalbedrag binnen ${days === 1 ? '1 dag' : `${days} dagen`}, uiterlijk zondag 22 november.`
})
const routeTitle = computed(() => {
  if (route.name === 'sales') return 'Mijn bestellingen'
  if (route.name === 'how-it-works') return 'Hoe werkt het?'
  if (route.name === 'leaderboard') return 'Verkopersranglijst'
  if (route.name === 'commission') return 'Club totalen'
  if (route.name === 'profile') return 'Verkopersprofiel'
  return 'Clubactie 2026'
})

watch(() => route.fullPath, () => { mobileMenuOpen.value = false })
watch(() => authState.user?.id, (id) => {
  clearSales()
  if (id) void loadSales()
}, { immediate: true })
watch(
  () => [authState.user?.id, authState.profileLoaded, authState.profile?.display_name, route.name] as const,
  ([id, loaded, name, routeName]) => {
    if (id && loaded && routeName === 'home' && !authState.error) {
      void router.replace(name ? (authState.profile?.role === 'admin' ? '/commissie' : '/mijn-bestellingen') : '/profiel')
    }
  },
)

function closeMenuOnOutsideClick(event: PointerEvent): void {
  if (event.target instanceof Node && !siteHeader.value?.contains(event.target)) mobileMenuOpen.value = false
}

onMounted(() => {
  clockTimer = window.setInterval(() => { currentTime.value = Date.now() }, 60_000)
  document.addEventListener('pointerdown', closeMenuOnOutsideClick)
})
onUnmounted(() => {
  window.clearInterval(clockTimer)
  document.removeEventListener('pointerdown', closeMenuOnOutsideClick)
})

async function logout(): Promise<void> {
  try {
    await signOut()
    await router.push('/')
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Uitloggen mislukt', detail: error instanceof Error ? error.message : 'Probeer het opnieuw.', life: 5000 })
  }
}
</script>

<template>
  <div class="app-shell">
    <header ref="siteHeader" class="site-header">
      <div class="site-header-inner">
        <RouterLink class="brand" to="/" aria-label="De Linge/PCG actie - startpagina">
          <img class="brand-logo" :src="`${baseUrl}logo.png`" alt="" />
          <span class="brand-copy"><strong>De Linge/PCG</strong><small>Speculaasactie</small></span>
        </RouterLink>
        <nav id="main-navigation" class="main-nav" :class="{ 'mobile-open': mobileMenuOpen }" aria-label="Hoofdnavigatie" @click="mobileMenuOpen = false">
          <RouterLink v-if="authState.user" :to="{ name: 'sales' }">Mijn bestellingen</RouterLink>
          <RouterLink to="/hoe-werkt-het">Hoe werkt het?</RouterLink>
          <RouterLink to="/ranglijst">Ranglijst</RouterLink>
          <RouterLink v-if="authState.profile?.role === 'admin'" to="/commissie">Club totalen</RouterLink>
          <button v-if="authState.user" type="button" class="mobile-logout" @click="logout">Uitloggen</button>
        </nav>
        <div class="header-actions">
          <span v-if="authState.profile?.display_name" class="seller-label">{{ authState.profile.display_name }}</span>
          <Button v-if="authState.user" class="desktop-logout" label="Uitloggen" severity="secondary" text @click="logout" />
        </div>
        <button type="button" class="mobile-menu-toggle" aria-controls="main-navigation" :aria-expanded="mobileMenuOpen" :aria-label="mobileMenuOpen ? 'Menu sluiten' : 'Menu openen'" @click="mobileMenuOpen = !mobileMenuOpen">
          <i :class="mobileMenuOpen ? 'pi pi-times' : 'pi pi-bars'" aria-hidden="true"></i>
        </button>
      </div>
    </header>
    <div v-if="!isSupabaseConfigured" class="setup-notice">
      <i class="pi pi-info-circle" aria-hidden="true"></i>
      De Supabase-koppeling moet nog worden ingesteld voordat aanmelden werkt.
    </div>
    <div v-else-if="authState.user && salesState.totalCents !== null && salesState.totalCents > 0 && !salesState.error" class="deadline-notice" :class="paid ? 'preview-paid-notice' : 'preview-unpaid-notice'">
      <i :class="paid ? 'pi pi-check-circle' : 'pi pi-exclamation-circle'" aria-hidden="true"></i>
      {{ paymentMessage }}
    </div>
    <div v-else class="deadline-notice preview-deadline-notice">
      <i class="pi pi-calendar" aria-hidden="true"></i> De besteltermijn is gesloten.
    </div>
    <div class="delivery-notice"><i class="pi pi-truck" aria-hidden="true"></i> De bestellingen zijn onderweg.</div>
    <main class="page-content">
      <div v-if="route.name !== 'home'" class="page-heading">
        <div><p class="eyebrow">De Linge/PCG · Speculaasactie 2026</p><h1>{{ routeTitle }}</h1></div>
      </div>
      <RouterView />
    </main>
    <footer class="site-footer"><span>De lekkerste clubactie</span><span>De besteltermijn is gesloten</span></footer>
    <Toast position="top-right" />
  </div>
</template>
