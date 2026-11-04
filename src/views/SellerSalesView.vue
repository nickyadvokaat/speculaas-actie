<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { fetchMySalesOrders, fetchMySalesTotal } from '../lib/data'
import { formatCurrency } from '../lib/pricing'
import { authState, refreshProfile } from '../stores/auth'
import type { MySaleOrder } from '../types'

const toast = useToast()
const orders = ref<MySaleOrder[]>([])
const totalCents = ref<number | null>(null)
const loading = ref(false)
const paidTotalCents = computed(() => Number(authState.profile?.paid_total_cents ?? 0))
const outstandingCents = computed(() =>
  Math.max((totalCents.value ?? 0) - paidTotalCents.value, 0),
)

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

async function load(): Promise<void> {
  loading.value = true
  try {
    await refreshProfile()
    const [total, salesOrders] = await Promise.all([
      fetchMySalesTotal(),
      fetchMySalesOrders(),
    ])
    totalCents.value = total
    orders.value = salesOrders
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Verkopen niet geladen',
      detail: error instanceof Error ? error.message : 'Controleer je verbinding en probeer opnieuw.',
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())
</script>

<template>
  <section class="seller-sales-page">
    <div class="seller-sales-heading">
      <div>
        <p class="eyebrow">Jouw actie-overzicht</p>
        <h2>Hoi {{ authState.profile?.display_name }}</h2>
        <p class="muted">Hier vind je jouw verkopen en wat er nog openstaat om over te maken.</p>
      </div>
      <Button
        label="Vernieuwen"
        icon="pi pi-refresh"
        severity="secondary"
        outlined
        :loading="loading"
        @click="load"
      />
    </div>

    <div class="seller-sales-stats">
      <Card class="stat-card stat-revenue">
        <template #content>
          <span class="stat-label">Jouw totale verkoop</span>
          <strong>{{ totalCents === null ? '—' : formatCurrency(totalCents) }}</strong>
          <small>in actieve bestellingen</small>
        </template>
      </Card>
      <Card class="stat-card">
        <template #content>
          <span class="stat-label">Als betaald afgevinkt</span>
          <strong>{{ formatCurrency(paidTotalCents) }}</strong>
          <small>door de commissie geregistreerd</small>
        </template>
      </Card>
      <Card class="stat-card">
        <template #content>
          <span class="stat-label">Nog openstaand</span>
          <strong>{{ totalCents === null ? '—' : formatCurrency(outstandingCents) }}</strong>
          <small>over te maken aan de club</small>
        </template>
      </Card>
    </div>

    <Card class="commission-card">
      <template #content>
        <div class="section-title table-heading">
          <div>
            <p class="eyebrow">Jouw administratie</p>
            <h2>Bestellingen</h2>
          </div>
          <span class="muted">{{ orders.length }} totaal</span>
        </div>
        <div v-if="loading && orders.length === 0" class="loading-state">
          <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Verkopen laden…
        </div>
        <div v-else-if="orders.length === 0" class="empty-state">
          <h3>Je hebt nog geen bestellingen ingevoerd</h3>
          <p>Voer je eerste verkoop in; deze verschijnt hier direct.</p>
          <RouterLink class="text-action" to="/bestellen">Nieuwe bestelling invoeren <i class="pi pi-arrow-right" aria-hidden="true"></i></RouterLink>
        </div>
        <div v-else class="sales-history-list">
          <article
            v-for="order in orders"
            :key="order.id"
            class="sales-history-order"
            :class="{ 'sales-history-cancelled': order.cancelled }"
          >
            <div class="sales-order-heading">
              <strong>{{ order.customer_name }}</strong>
              <Tag v-if="order.cancelled" value="Geannuleerd" severity="danger" />
              <strong v-else class="sales-order-total">{{ formatCurrency(order.total_cents) }}</strong>
            </div>
            <small>{{ formatDate(order.created_at) }}</small>
            <p>
              {{ [
                order.speculaaspoppen && `${order.speculaaspoppen} speculaaspop(pen)`,
                order.stroopwafels && `${order.stroopwafels} gewoon`,
                order.glutenvrij && `${order.glutenvrij} glutenvrij`,
                order.lactosevrij && `${order.lactosevrij} lactosevrij`,
              ].filter(Boolean).join(' · ') }}
            </p>
            <strong v-if="order.cancelled" class="cancelled-order-total">
              {{ formatCurrency(order.total_cents) }}
            </strong>
          </article>
        </div>
      </template>
    </Card>
  </section>
</template>
