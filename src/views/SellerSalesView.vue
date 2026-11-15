<script setup lang="ts">
import { computed, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { formatCurrency } from '../lib/pricing'
import { setMyOrderDelivered } from '../lib/data'
import { authState } from '../stores/auth'
import { loadSales, salesState, type SellerOrder } from '../stores/sales'

const toast = useToast()
const updating = ref(new Set<string>())
const total = computed(() => salesState.totalCents)
const paid = computed(() => total.value !== null && total.value > 0 && Number(authState.profile?.paid_total_cents ?? 0) >= total.value)
const activeOrders = computed(() => salesState.orders.filter((order) => !order.cancelled))
const packageGiven = computed(() => activeOrders.value.length > 0 && activeOrders.value.every((order) => order.package_given))

function products(order: SellerOrder): string[] {
  return [
    order.speculaaspoppen && `${order.speculaaspoppen} speculaaspop(pen)`,
    order.stroopwafels && `${order.stroopwafels} gewone stroopwafelpakje(s)`,
    order.glutenvrij && `${order.glutenvrij} glutenvrije stroopwafelpakje(s)`,
    order.lactosevrij && `${order.lactosevrij} lactosevrije stroopwafelpakje(s)`,
  ].filter((item): item is string => Boolean(item))
}

async function updateDelivery(order: SellerOrder, event: Event): Promise<void> {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  const next = input.checked
  updating.value.add(order.id)
  try {
    await setMyOrderDelivered(order.id, next)
    order.delivered_to_customer = next
  } catch (error) {
    input.checked = order.delivered_to_customer
    toast.add({
      severity: 'error',
      summary: 'Uitdeelstatus niet opgeslagen',
      detail: error instanceof Error ? error.message : 'Probeer het opnieuw.',
      life: 5000,
    })
  } finally {
    updating.value.delete(order.id)
  }
}
</script>

<template>
  <section class="seller-sales-page">
    <Message v-if="salesState.error" severity="error" :closable="false">
      Je overzicht kon niet worden geladen: {{ salesState.error }}
      <Button label="Opnieuw proberen" severity="secondary" text @click="loadSales" />
    </Message>
    <div v-else-if="salesState.loading && total === null" class="loading-state">
      <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Bestellingen laden…
    </div>
    <template v-else-if="total !== null">
      <Card class="stat-card stat-revenue seller-payment-card">
        <template #content>
          <div class="seller-payment-summary">
            <div class="seller-payment-amount">
              <span class="stat-label">Jouw totaalbedrag</span>
              <strong>{{ formatCurrency(total) }}</strong>
              <Tag v-if="total === 0" value="Geen openstaand bedrag" severity="secondary" />
              <Tag v-else-if="paid" value="Betaald" severity="success" />
              <Tag v-else value="Nog niet betaald" class="seller-payment-status" />
              <span v-if="!paid && total > 0" class="seller-payment-deadline">
                Reken zelf af met je kopers en maak het totaal uiterlijk zondag 22 november in één keer over aan de club.
              </span>
            </div>
            <a v-if="!paid && total > 0" class="payment-link" href="https://betaalverzoek.rabobank.nl/betaalverzoek/?id=V9NAuz2jS_aQ0wIXv368ow" target="_blank" rel="noopener noreferrer">
              Naar betaalverzoek <i class="pi pi-external-link" aria-hidden="true"></i>
            </a>
          </div>
          <p v-if="!paid && total > 0" class="seller-payment-notice">
            <i class="pi pi-info-circle" aria-hidden="true"></i>
            <span>De commissie verwerkt betalingen handmatig. Het kan enkele dagen duren voordat je betaling hier als betaald staat.</span>
          </p>
        </template>
      </Card>
      <Card class="commission-card">
        <template #content>
          <div class="section-title table-heading">
            <div><p class="eyebrow">Jouw administratie</p><h2>Bestellingen</h2></div>
            <div class="seller-order-status">
              <Tag v-if="activeOrders.length" :value="packageGiven ? 'Pakket ontvangen' : 'Pakket nog niet ontvangen'" :severity="packageGiven ? 'success' : 'secondary'" />
              <span class="muted">{{ salesState.orders.length }} totaal</span>
              <Button label="Vernieuwen" icon="pi pi-refresh" severity="secondary" outlined :loading="salesState.loading" @click="loadSales" />
            </div>
          </div>
          <div v-if="!salesState.orders.length" class="empty-state">
            <h3>Je hebt geen bestellingen</h3>
            <p>Er zijn geen bestellingen aan jouw account gekoppeld.</p>
          </div>
          <div v-else class="sales-history-list">
            <article v-for="order in salesState.orders" :key="order.id" class="sales-history-order" :class="{ 'sales-history-cancelled': order.cancelled }">
              <div class="sales-order-heading">
                <strong>{{ order.customer_name }}</strong>
                <Tag v-if="order.cancelled" value="Geannuleerd" severity="danger" />
                <strong class="sales-order-total">{{ formatCurrency(order.total_cents) }}</strong>
              </div>
              <ul class="seller-order-products"><li v-for="product in products(order)" :key="product">{{ product }}</li></ul>
              <label v-if="!order.cancelled" class="seller-customer-delivery">
                <input type="checkbox" :checked="order.delivered_to_customer" :disabled="updating.has(order.id) || salesState.loading" @change="updateDelivery(order, $event)" />
                <span>Uitgedeeld aan koper</span>
              </label>
            </article>
          </div>
        </template>
      </Card>
    </template>
  </section>
</template>
