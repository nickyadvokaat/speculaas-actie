<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { fetchLeaderboard, submitOrder } from '../lib/data'
import { areOrdersClosed } from '../lib/campaign'
import { rankLeaderboardEntries } from '../lib/leaderboard'
import { authState } from '../stores/auth'
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

const toast = useToast()
const counts = reactive<ProductCounts>(emptyCounts())
const purchaseMode = ref<'self' | 'customer' | null>(null)
const customerName = ref('')
const address = ref('')
const saving = ref(false)
const confirmationVisible = ref(false)
const paymentConfirmed = ref(false)
const successVisible = ref(false)
const completedOrder = ref<{
  buyer: string
  totalCents: number
  rank: number | null
  sharedRank: boolean
  rankUnavailable: boolean
} | null>(null)
const currentTime = ref(Date.now())
let deadlineTimer = 0
const ordersClosed = computed(() => areOrdersClosed(new Date(currentTime.value)))
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
    items: [{ key: 'speculaaspoppen', label: 'Speculaaspop', price: '€ 7,00 per stuk', image: 'speculaaspop-waterpolo.png' }],
  },
  {
    title: 'Gewone stroopwafels',
    description: '10 stuks per pakje · 1 voor € 3,30 · 3 voor € 9,00',
    items: [{ key: 'stroopwafels', label: 'Pakje gewone stroopwafels', price: '3 voor € 9,00', image: 'stroopwafels.png' }],
  },
  {
    title: 'Speciale stroopwafels',
    description: 'Glutenvrij en lactosevrij combineren voor de staffelkorting',
    items: [
      { key: 'glutenvrij', label: 'Pakje glutenvrije stroopwafels', price: '€ 4,60 per pakje', image: 'stroopwafels-glutenvrij.png' },
      { key: 'lactosevrij', label: 'Pakje lactosevrije stroopwafels', price: '€ 4,60 per pakje', image: 'stroopwafels-lactosevrij.png' },
    ],
  },
] as const

const baseUrl = import.meta.env.BASE_URL

function requestOrderConfirmation(): void {
  if (!ordersClosed.value && customerName.value.trim() && orderIsValid.value) {
    paymentConfirmed.value = false
    confirmationVisible.value = true
  }
}

function setPurchaseMode(mode: 'self' | 'customer'): void {
  purchaseMode.value = mode
  customerName.value = mode === 'self' ? authState.profile?.display_name ?? '' : ''
  address.value = ''
}

async function confirmOrder(): Promise<void> {
  const buyer = customerName.value.trim()
  if (ordersClosed.value || !buyer || !orderIsValid.value || !paymentConfirmed.value) return
  saving.value = true
  try {
    await submitOrder(buyer, address.value, counts)
    let rank: number | null = null
    let sharedRank = false
    let rankUnavailable = false
    try {
      const entries = rankLeaderboardEntries(await fetchLeaderboard())
      const sellerEntry = entries.find((entry) => entry.display_name === authState.profile?.display_name)
      rank = sellerEntry?.rank ?? null
      sharedRank = sellerEntry?.shared ?? false
      rankUnavailable = sellerEntry === undefined
    } catch {
      rankUnavailable = true
    }
    completedOrder.value = { buyer, totalCents: totalCents.value, rank, sharedRank, rankUnavailable }
    confirmationVisible.value = false
    Object.assign(counts, emptyCounts())
    purchaseMode.value = null
    customerName.value = ''
    address.value = ''
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

onMounted(() => {
  deadlineTimer = window.setInterval(() => {
    currentTime.value = Date.now()
  }, 60_000)
})

onUnmounted(() => window.clearInterval(deadlineTimer))
</script>

<template>
  <div class="order-layout">
    <form class="order-form" @submit.prevent="requestOrderConfirmation">
      <Message v-if="ordersClosed" severity="warn" :closable="false">
        Nieuwe bestellingen invoeren is sinds 12 november 2026 gesloten.
      </Message>
      <Card class="buyer-card">
        <template #title>
          <span class="step-number">1</span>
          Voor wie is deze bestelling?
        </template>
        <template #content>
          <div class="purchase-mode-options">
            <label class="purchase-mode-option" :class="{ selected: purchaseMode === 'self' }">
              <input
                type="radio"
                name="purchase-mode"
                :checked="purchaseMode === 'self'"
                :disabled="ordersClosed"
                @change="setPurchaseMode('self')"
              />
              <span>
                <strong>Ik koop zelf</strong>
                <small>Gebruik mijn ranglijstnaam: {{ authState.profile?.display_name }}</small>
              </span>
            </label>
            <label class="purchase-mode-option" :class="{ selected: purchaseMode === 'customer' }">
              <input
                type="radio"
                name="purchase-mode"
                :checked="purchaseMode === 'customer'"
                :disabled="ordersClosed"
                @change="setPurchaseMode('customer')"
              />
              <span>
                <strong>Ik verkoop aan iemand</strong>
                <small>Vul de naam van de koper in</small>
              </span>
            </label>
          </div>
        </template>
      </Card>

      <Card v-if="purchaseMode" class="buyer-card">
        <template #title>
          <span class="step-number">2</span>
          {{ purchaseMode === 'self' ? 'Jouw bestelling' : 'Gegevens van de koper' }}
        </template>
        <template #content>
          <p v-if="purchaseMode === 'self'" class="muted self-purchase-name">
            Bestelling op naam van <strong>{{ customerName }}</strong>.
          </p>
          <div v-else class="form-grid">
            <div class="field">
              <label for="customer-name">Naam koper <span class="required">*</span></label>
              <InputText
                id="customer-name"
                v-model="customerName"
                maxlength="100"
                autocomplete="off"
                placeholder="Naam van de koper"
                required
                :disabled="ordersClosed"
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
                :disabled="ordersClosed"
              />
            </div>
          </div>
          <p class="privacy-note">
            <i class="pi pi-lock" aria-hidden="true"></i>
            Bestelgegevens zijn alleen zichtbaar voor de commissie.
          </p>
        </template>
      </Card>

      <Card v-if="purchaseMode" class="products-card">
        <template #title>
          <span class="step-number">3</span>
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
                  :disabled="ordersClosed"
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
            <p v-if="!purchaseMode" class="muted">Kies eerst voor wie deze bestelling is.</p>
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
            :disabled="ordersClosed || !purchaseMode || !customerName.trim() || !orderIsValid"
            @click="requestOrderConfirmation"
          />
          <p class="muted tiny-note">
            Regel de betaling met de koper en maak jouw verkooptotaal daarna in één keer over naar de club.
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
      <p v-if="completedOrder?.rank" class="success-rank">
        Je staat nu op de <strong>{{ completedOrder.rank }}e plaats</strong> op de ranglijst.
        <span v-if="completedOrder.sharedRank">Deze plaats deel je met andere verkopers.</span>
      </p>
      <p v-else-if="completedOrder?.rankUnavailable" class="muted">
        Je bestelling is opgeslagen, maar je ranglijstpositie kon niet worden opgehaald.
      </p>
      <p v-else class="muted">Je ranglijstpositie is nog niet beschikbaar.</p>
      <Button label="Verder met bestellen" icon="pi pi-arrow-right" icon-pos="right" @click="successVisible = false" />
    </div>
  </Dialog>
</template>
