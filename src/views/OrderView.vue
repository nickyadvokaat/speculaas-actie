<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { fetchMySalesOrders, fetchMySalesTotal, submitOrder } from '../lib/data'
import {
  calculateDiscountCents,
  calculateTotalCents,
  emptyCounts,
  formatCurrency,
  isValidOrder,
  ORDER_LIMIT_CENTS,
  PRODUCT_LIMIT,
  type ProductCounts,
} from '../lib/pricing'
import type { MySaleOrder } from '../types'

const toast = useToast()
const counts = reactive<ProductCounts>(emptyCounts())
const customerName = ref('')
const address = ref('')
const saving = ref(false)
const confirmationVisible = ref(false)
const paymentConfirmed = ref(false)
const successVisible = ref(false)
const mySalesTotalCents = ref<number | null>(null)
const mySalesOrders = ref<MySaleOrder[]>([])
const salesExpanded = ref(false)
const salesLoading = ref(false)
const completedOrder = ref<{ buyer: string; totalCents: number } | null>(null)
const totalCents = computed(() => calculateTotalCents(counts))
const discountCents = computed(() => calculateDiscountCents(counts))
const specialWaffleCount = computed(() => counts.glutenvrij + counts.lactosevrij)
const specialWaffleTotal = computed(
  () =>
    Math.floor(specialWaffleCount.value / 3) * 1250 +
    (specialWaffleCount.value % 3) * 460,
)
const orderIsValid = computed(() => isValidOrder(counts))
const limitMessage = computed(() => {
  if (Object.values(counts).some((count) => count > PRODUCT_LIMIT)) {
    return `Je kunt maximaal ${PRODUCT_LIMIT} stuks per product bestellen.`
  }
  if (totalCents.value > ORDER_LIMIT_CENTS) {
    return `Het maximum per bestelling is ${formatCurrency(ORDER_LIMIT_CENTS)}.`
  }
  return ''
})

const productGroups = [
  {
    title: 'Speculaaspoppen',
    description: '500 gram · € 7,00 per stuk',
    items: [{ key: 'speculaaspoppen', label: 'Speculaaspop', price: '€ 7,00 per stuk', image: 'speculaaspop.svg' }],
  },
  {
    title: 'Gewone stroopwafels',
    description: '10 stuks per pakje · 1 voor € 3,30 · 3 voor € 9,00',
    items: [{ key: 'stroopwafels', label: 'Pakje gewone stroopwafels', price: '3 voor € 9,00', image: 'stroopwafels.svg' }],
  },
  {
    title: 'Speciale stroopwafels',
    description: 'Glutenvrij en lactosevrij combineren voor de staffelkorting',
    items: [
      { key: 'glutenvrij', label: 'Pakje glutenvrije stroopwafels', price: '€ 4,60 per pakje', image: 'glutenvrij.svg' },
      { key: 'lactosevrij', label: 'Pakje lactosevrije stroopwafels', price: '€ 4,60 per pakje', image: 'lactosevrij.svg' },
    ],
  },
] as const

const baseUrl = import.meta.env.BASE_URL

async function loadMySalesTotal(): Promise<void> {
  try {
    mySalesTotalCents.value = await fetchMySalesTotal()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Verkooptotaal niet geladen',
      detail: error instanceof Error ? error.message : 'Controleer je verbinding en probeer opnieuw.',
      life: 5000,
    })
  }
}

async function loadMySalesOrders(): Promise<void> {
  salesLoading.value = true
  try {
    mySalesOrders.value = await fetchMySalesOrders()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Je transacties niet geladen',
      detail: error instanceof Error ? error.message : 'Controleer je verbinding en probeer opnieuw.',
      life: 5000,
    })
  } finally {
    salesLoading.value = false
  }
}

async function toggleSales(): Promise<void> {
  salesExpanded.value = !salesExpanded.value
  if (salesExpanded.value) {
    await Promise.all([loadMySalesOrders(), loadMySalesTotal()])
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function requestOrderConfirmation(): void {
  if (customerName.value.trim() && orderIsValid.value) {
    paymentConfirmed.value = false
    confirmationVisible.value = true
  }
}

async function confirmOrder(): Promise<void> {
  const buyer = customerName.value.trim()
  if (!buyer || !orderIsValid.value || !paymentConfirmed.value) return
  saving.value = true
  try {
    await submitOrder(buyer, address.value, counts)
    completedOrder.value = { buyer, totalCents: totalCents.value }
    confirmationVisible.value = false
    Object.assign(counts, emptyCounts())
    customerName.value = ''
    address.value = ''
    await Promise.all([
      loadMySalesTotal(),
      ...(salesExpanded.value ? [loadMySalesOrders()] : []),
    ])
    successVisible.value = true
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Bestelling niet opgeslagen',
      detail: error instanceof Error ? error.message : 'Controleer je invoer en probeer opnieuw.',
      life: 6000,
    })
  } finally {
    saving.value = false
  }
}

onMounted(() => void loadMySalesTotal())
</script>

<template>
  <div class="order-layout">
    <form class="order-form" @submit.prevent="requestOrderConfirmation">
      <Card class="seller-total-card" :class="{ 'sales-expanded': salesExpanded }">
        <template #content>
          <button
            type="button"
            class="seller-total-toggle"
            :aria-expanded="salesExpanded"
            aria-controls="seller-sales-history"
            @click="toggleSales"
          >
            <span class="seller-total-copy">
              <span class="stat-label">Jouw totale verkoop</span>
              <strong v-if="mySalesTotalCents !== null">{{ formatCurrency(mySalesTotalCents) }}</strong>
              <strong v-else aria-label="Verkooptotaal laden"><i class="pi pi-spin pi-spinner" aria-hidden="true"></i></strong>
              <small>{{ salesExpanded ? 'Verberg je transacties' : 'Bekijk je transacties' }}</small>
            </span>
            <span class="seller-total-action">
              <i :class="salesExpanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" aria-hidden="true"></i>
            </span>
          </button>
          <div v-if="salesExpanded" id="seller-sales-history" class="sales-history">
            <div class="sales-history-heading">
              <strong>Jouw transacties</strong>
              <Button
                type="button"
                icon="pi pi-refresh"
                text
                rounded
                severity="secondary"
                aria-label="Transacties vernieuwen"
                :loading="salesLoading"
                @click="loadMySalesOrders"
              />
            </div>
            <div v-if="salesLoading" class="sales-history-state">
              <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Transacties laden…
            </div>
            <div v-else-if="mySalesOrders.length === 0" class="sales-history-state">
              Je hebt nog geen bestellingen ingevoerd.
            </div>
            <div v-else class="sales-history-list">
              <article
                v-for="order in mySalesOrders"
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
          </div>
        </template>
      </Card>
      <Card class="buyer-card">
        <template #title>
          <span class="step-number">1</span>
          Gegevens van de koper
        </template>
        <template #content>
          <div class="form-grid">
            <div class="field">
              <label for="customer-name">Naam koper <span class="required">*</span></label>
              <InputText
                id="customer-name"
                v-model="customerName"
                maxlength="100"
                autocomplete="off"
                placeholder="Naam van de koper"
                required
              />
            </div>
            <div class="field">
              <label for="customer-address">Adres <span class="muted">(optioneel)</span></label>
              <InputText
                id="customer-address"
                v-model="address"
                maxlength="250"
                autocomplete="street-address"
                placeholder="Straat en huisnummer"
              />
            </div>
          </div>
          <p class="privacy-note">
            <i class="pi pi-lock" aria-hidden="true"></i>
            Kopergegevens zijn alleen zichtbaar voor de commissie.
          </p>
        </template>
      </Card>

      <Card class="products-card">
        <template #title>
          <span class="step-number">2</span>
          Kies de producten
        </template>
        <template #content>
          <section v-for="group in productGroups" :key="group.title" class="product-group">
            <div class="group-heading">
              <h3>{{ group.title }}</h3>
              <p>{{ group.description }}</p>
            </div>
            <div class="product-quantity-list">
              <div v-for="item in group.items" :key="item.key" class="quantity-row">
                <img class="quantity-product-art" :src="`${baseUrl}products/${item.image}`" alt="" />
                <div class="quantity-product-copy">
                  <strong>{{ item.label }}</strong>
                  <small>{{ item.price }}</small>
                </div>
                <InputNumber
                  v-model="counts[item.key]"
                  :input-id="`quantity-${item.key}`"
                  :min="0"
                  :max="PRODUCT_LIMIT"
                  :min-fraction-digits="0"
                  :max-fraction-digits="0"
                  show-buttons
                  button-layout="horizontal"
                  increment-button-icon="pi pi-plus"
                  decrement-button-icon="pi pi-minus"
                  input-class="quantity-input"
                  aria-label="Aantal"
                />
              </div>
            </div>
          </section>
          <Message v-if="limitMessage" severity="warn" :closable="false">
            {{ limitMessage }}
          </Message>
        </template>
      </Card>
    </form>

    <aside class="order-summary">
      <Card class="summary-card">
        <template #title>Overzicht</template>
        <template #content>
          <div class="summary-lines">
            <div v-if="counts.speculaaspoppen"><span>{{ counts.speculaaspoppen }} × speculaaspop</span><strong>{{ formatCurrency(counts.speculaaspoppen * 700) }}</strong></div>
            <div v-if="counts.stroopwafels"><span>{{ counts.stroopwafels }} × gewoon stroopwafelpakje</span><strong>{{ formatCurrency(Math.floor(counts.stroopwafels / 3) * 900 + (counts.stroopwafels % 3) * 330) }}</strong></div>
            <div v-if="specialWaffleCount"><span>{{ counts.glutenvrij }} glutenvrij · {{ counts.lactosevrij }} lactosevrij</span><strong>{{ formatCurrency(specialWaffleTotal) }}</strong></div>
            <p v-if="!totalCents" class="muted">Je bestelling is nog leeg.</p>
          </div>
          <Divider />
          <div class="total-row"><span>Totaal</span><strong>{{ formatCurrency(totalCents) }}</strong></div>
          <div v-if="discountCents > 0" class="discount-total">
            <span><i class="pi pi-tag" aria-hidden="true"></i> Jouw korting</span>
            <strong>− {{ formatCurrency(discountCents) }}</strong>
          </div>
          <p class="discount-note">
            <i class="pi pi-info-circle" aria-hidden="true"></i>
            {{ discountCents > 0
              ? 'De korting is al verrekend in het totaal.'
              : 'Korting geldt vanaf 3 pakjes gewone of glutenvrije/lactosevrije stroopwafels.' }}
          </p>
          <Button
            label="Bestelling afronden"
            icon="pi pi-arrow-right"
            icon-pos="right"
            class="submit-order"
            :disabled="!customerName.trim() || !orderIsValid"
            @click="requestOrderConfirmation"
          />
          <p class="muted tiny-note">
            Betaling regel je buiten deze app. Er wordt geen betaalstatus opgeslagen.
          </p>
        </template>
      </Card>
    </aside>
  </div>

  <Dialog
    v-model:visible="confirmationVisible"
    modal
    header="Bestelling controleren"
    :style="{ width: 'min(28rem, 94vw)' }"
    :closable="!saving"
    :close-on-escape="!saving"
  >
    <div class="confirm-order-content">
      <p>Controleer de bestelling voor <strong>{{ customerName.trim() }}</strong>.</p>
      <div class="confirm-order-lines">
        <div v-if="counts.speculaaspoppen"><span>{{ counts.speculaaspoppen }} × speculaaspop</span><strong>{{ formatCurrency(counts.speculaaspoppen * 700) }}</strong></div>
        <div v-if="counts.stroopwafels"><span>{{ counts.stroopwafels }} × gewoon stroopwafelpakje</span><strong>{{ formatCurrency(Math.floor(counts.stroopwafels / 3) * 900 + (counts.stroopwafels % 3) * 330) }}</strong></div>
        <div v-if="specialWaffleCount"><span>{{ counts.glutenvrij }} glutenvrij · {{ counts.lactosevrij }} lactosevrij</span><strong>{{ formatCurrency(specialWaffleTotal) }}</strong></div>
        <div v-if="discountCents > 0" class="confirm-discount"><span>Korting inbegrepen</span><strong>− {{ formatCurrency(discountCents) }}</strong></div>
        <div class="confirm-order-total"><span>Totaal</span><strong>{{ formatCurrency(totalCents) }}</strong></div>
      </div>
      <label class="payment-confirmation" for="payment-confirmed">
        <input id="payment-confirmed" v-model="paymentConfirmed" type="checkbox" />
        <span>
          Ik ga akkoord met het totaalbedrag en regel de betaling rechtstreeks met de koper.
        </span>
      </label>
      <p class="muted">Na opslaan telt deze verkoop direct mee in jouw totaal en de tussenstand.</p>
    </div>
    <template #footer>
      <Button label="Terug" severity="secondary" text :disabled="saving" @click="confirmationVisible = false" />
      <Button
        label="Ja, bestelling opslaan"
        icon="pi pi-check"
        :loading="saving"
        :disabled="!paymentConfirmed"
        @click="confirmOrder"
      />
    </template>
  </Dialog>

  <Dialog
    v-model:visible="successVisible"
    modal
    :show-header="false"
    :closable="false"
    :close-on-escape="false"
    :style="{ width: 'min(25rem, 92vw)' }"
    class="order-success-dialog"
  >
    <div class="order-success-content">
      <div class="success-animation" role="img" aria-label="Bestelling succesvol opgeslagen">
        <span class="success-spark spark-one"></span>
        <span class="success-spark spark-two"></span>
        <span class="success-spark spark-three"></span>
        <svg viewBox="0 0 72 72" aria-hidden="true">
          <circle class="success-circle" cx="36" cy="36" r="31" />
          <path class="success-check" d="m20 37 10 10 22-23" />
        </svg>
      </div>
      <p class="eyebrow">Gelukt!</p>
      <h2>Bestelling opgeslagen</h2>
      <p>De verkoop van <strong>{{ completedOrder?.buyer }}</strong> is toegevoegd.</p>
      <div class="success-amount">{{ completedOrder ? formatCurrency(completedOrder.totalCents) : '' }}</div>
      <p class="muted">Je verkooptotaal en de tussenstand zijn bijgewerkt.</p>
      <Button label="Verder met bestellen" icon="pi pi-arrow-right" icon-pos="right" @click="successVisible = false" />
    </div>
  </Dialog>
</template>
