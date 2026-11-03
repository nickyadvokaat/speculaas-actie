<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchLeaderboard } from '../lib/data'
import { formatCurrency } from '../lib/pricing'
import type { LeaderboardEntry } from '../types'

const entries = ref<LeaderboardEntry[]>([])
const loading = ref(true)
const errorMessage = ref('')

async function load(): Promise<void> {
  loading.value = true
  errorMessage.value = ''
  try {
    entries.value = await fetchLeaderboard()
  } catch (error) {
    errorMessage.value = error instanceof Error
      ? error.message
      : 'De ranglijst kon niet worden geladen.'
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())
</script>

<template>
  <div class="content-grid">
    <Card class="wide-card">
      <template #content>
        <div class="section-title leaderboard-title">
          <div>
            <p class="eyebrow">Samen maken we verschil</p>
            <h2>De tussenstand</h2>
            <p class="muted">Verkoopopbrengst per verkoper · bijgewerkt na iedere bestelling</p>
          </div>
          <Button label="Vernieuwen" icon="pi pi-refresh" severity="secondary" outlined @click="load" />
        </div>
        <Message v-if="errorMessage" severity="warn" :closable="false">
          {{ errorMessage }}
        </Message>
        <div v-else-if="loading" class="loading-state">
          <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Ranglijst laden…
        </div>
        <div v-else-if="entries.length === 0" class="empty-state">
          <span class="empty-icon"><i class="pi pi-chart-bar" aria-hidden="true"></i></span>
          <h3>De eerste bestelling moet nog binnenkomen</h3>
          <p>De ranglijst verschijnt zodra de actie van start gaat.</p>
        </div>
        <div v-else class="leaderboard-list">
          <div
            v-for="(entry, index) in entries"
            :key="`${entry.display_name}-${index}`"
            class="leaderboard-row"
            :class="{ 'top-rank': index < 3 }"
          >
            <span class="rank-number">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="rank-medal" v-if="index === 0">★</span>
            <div class="rank-avatar">{{ entry.display_name.slice(0, 1).toUpperCase() }}</div>
            <strong class="rank-name">{{ entry.display_name }}</strong>
            <div class="rank-bar"><span :style="{ width: `${Math.max(14, (Number(entry.total_cents) / Math.max(...entries.map((item) => Number(item.total_cents)))) * 100)}%` }"></span></div>
            <strong class="rank-total">{{ formatCurrency(Number(entry.total_cents)) }}</strong>
          </div>
        </div>
        <p class="privacy-note">
          <i class="pi pi-eye-slash" aria-hidden="true"></i>
          Alleen de ranglijstnaam en totale verkoopopbrengst zijn openbaar.
        </p>
      </template>
    </Card>
    <aside class="side-card">
      <div class="side-icon"><i class="pi pi-bolt" aria-hidden="true"></i></div>
      <p class="eyebrow">Elke verkoop telt</p>
      <h3>Doe mee en help de club vooruit.</h3>
      <p>Jouw inzet maakt deze actie een succes. De tussenstand wordt direct bijgewerkt.</p>
      <RouterLink class="text-action" to="/bestellen">
        Bestelling invoeren <i class="pi pi-arrow-right" aria-hidden="true"></i>
      </RouterLink>
    </aside>
  </div>
</template>
