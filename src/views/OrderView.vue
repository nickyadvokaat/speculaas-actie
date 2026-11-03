<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { fetchMySalesTotal, submitOrder } from '../lib/data'
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
import { authState } from '../stores/auth'

const toast = useToast()
const counts = reactive<ProductCounts>(emptyCounts())
const customerName = ref(authState.profile?.display_name ?? '')
const address = ref('')
const saving = ref(false)
const savedOrderId = ref('')
const mySalesTotalCents = ref<number | null>(null)
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

async function saveOrder(): Promise<void> {
  const buyer = customerName.value.trim()
  if (!buyer || !orderIsValid.value) return
  saving.value = true
  savedOrderId.value = ''
  try {
    savedOrderId.value = await submitOrder(buyer, address.value, counts)
    if (mySalesTotalCents.value !== null) mySalesTotalCents.value += totalCents.value
    toast.add({
      severity: 'success',
      summary: 'Bestelling opgeslagen',
      detail: 'De verkoop is direct verwerkt in de ranglijst.',
      life: 5000,
    })
    Object.assign(counts, emptyCounts())
    customerName.value = authState.profile?.display_name ?? ''
    address.value = ''
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
    <form class="order-form" @submit.prevent="saveOrder">
      <Card class="seller-total-card">
        <template #content>
          <div class="seller-total-copy">
            <span class="stat-label">Jouw totale verkoop</span>
            <strong v-if="mySalesTotalCents !== null">{{ formatCurrency(mySalesTotalCents) }}</strong>
            <strong v-else aria-label="Verkooptotaal laden"><i class="pi pi-spin pi-spinner" aria-hidden="true"></i></strong>
            <small>Alle actieve bestellingen van jou samen</small>
          </div>
          <i class="pi pi-chart-line seller-total-icon" aria-hidden="true"></i>
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
                autocomplete="name"
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
            icon="pi pi-check"
            class="submit-order"
            :loading="saving"
            :disabled="!customerName.trim() || !orderIsValid"
            @click="saveOrder"
          />
          <p class="muted tiny-note">
            Betaling regel je buiten deze app. Er wordt geen betaalstatus opgeslagen.
          </p>
        </template>
      </Card>
      <Message v-if="savedOrderId" severity="success" :closable="false" class="saved-message">
        <strong>Bestelling afgerond!</strong>
        <span>Je verkoop is direct op de ranglijst verwerkt.</span>
      </Message>
    </aside>
  </div>
</template>
