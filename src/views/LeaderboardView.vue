<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchLeaderboard } from '../lib/data'
import { formatCurrency } from '../lib/pricing'
import type { LeaderboardEntry } from '../types'

const entries = ref<LeaderboardEntry[]>([])
const loading = ref(true)
const errorMessage = ref('')
const rankedEntries = computed(() => {
  let previousTotal: number | null = null
  let previousRank = 0
  const ranked = entries.value.map((entry, index) => {
    const total = Number(entry.total_cents)
    const rank = total === previousTotal ? previousRank : index + 1
    previousTotal = total
    previousRank = rank
    return { ...entry, rank }
  })
  const rankCounts = new Map<number, number>()
  for (const entry of ranked) rankCounts.set(entry.rank, (rankCounts.get(entry.rank) ?? 0) + 1)
  return ranked.map((entry) => ({ ...entry, shared: (rankCounts.get(entry.rank) ?? 0) > 1 }))
})

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
            <p class="muted">Totale verkoopopbrengst per verkoper. Iedere bestelling telt meteen mee; geannuleerde bestellingen niet.</p>
          </div>
          <Button class="leaderboard-refresh" label="Vernieuwen" icon="pi pi-refresh" severity="secondary" outlined @click="load" />
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
            v-for="entry in rankedEntries"
            :key="`${entry.display_name}-${entry.rank}`"
            class="leaderboard-row"
            :class="{ 'top-rank': entry.rank <= 3 }"
          >
            <span class="rank-number" :aria-label="`${entry.rank}e plaats${entry.shared ? ', gedeeld' : ''}`">
              {{ entry.rank }}e
              <small v-if="entry.shared">gedeeld</small>
            </span>
            <span class="rank-avatar-wrap">
              <span class="rank-avatar">{{ entry.display_name.slice(0, 1).toUpperCase() }}</span>
              <span v-if="entry.rank === 1" class="rank-medal" aria-label="Eerste plaats">★</span>
            </span>
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
    <Card class="prizes-card">
      <template #content>
        <p class="eyebrow">Extra beloning</p>
        <h2>Prijzen voor de top 3</h2>
        <p class="muted">De verkopers met de hoogste totale verkoopopbrengst winnen een cadeaubon.</p>
        <div class="prize-list">
          <div
            v-for="prize in [
              { place: '1e plaats', amount: '€ 25', icon: 'pi pi-trophy', style: 'gold' },
              { place: '2e plaats', amount: '€ 15', icon: 'pi pi-star-fill', style: 'silver' },
              { place: '3e plaats', amount: '€ 10', icon: 'pi pi-star', style: 'bronze' },
            ]"
            :key="prize.place"
            class="prize-row"
            :class="`prize-${prize.style}`"
          >
            <span class="prize-icon"><i :class="prize.icon" aria-hidden="true"></i></span>
            <strong>{{ prize.place }}</strong>
            <span>cadeaubon</span>
            <strong class="prize-value">{{ prize.amount }}</strong>
          </div>
        </div>
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
