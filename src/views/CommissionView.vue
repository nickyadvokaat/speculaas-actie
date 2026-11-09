<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import {
  fetchCommissionData,
  setSellerOrdersGiven,
  setSellerPaid,
  updateOrder,
  updateSellerName,
} from '../lib/data'
import {
  calculateDiscountCents,
  calculateTotalCents,
  formatCurrency,
  type ProductCounts,
} from '../lib/pricing'
import type { SaleOrder, SellerProfile } from '../types'

const toast = useToast()
const orders = ref<SaleOrder[]>([])
const sellers = ref<SellerProfile[]>([])
const loading = ref(true)
const search = ref('')
const includeCancelled = ref(false)
const expandedSellerRows = ref<Record<string, boolean>>({})
const editVisible = ref(false)
const editing = ref<SaleOrder | null>(null)
const editCounts = reactive<ProductCounts>({
  speculaaspoppen: 0,
  stroopwafels: 0,
  glutenvrij: 0,
  lactosevrij: 0,
})
const editBuyer = ref('')
const editAddress = ref('')
const saving = ref(false)
const updatingPaymentSellerId = ref<string | null>(null)
const sellerNameDrafts = reactive<Record<string, string>>({})

const activeOrders = computed(() => orders.value.filter((order) => !order.cancelled))
const sellerDeliveryStats = computed(() => {
  const activeSellerIds = new Set(activeOrders.value.map((order) => order.seller_id))
  const deliveredSellerCount = [...activeSellerIds].filter((sellerId) =>
    activeOrders.value
      .filter((order) => order.seller_id === sellerId)
      .every((order) => order.given),
  ).length
  return { deliveredSellerCount, sellerCount: activeSellerIds.size }
})
const totals = computed(() => {
  const counts = activeOrders.value.reduce<ProductCounts>(
    (sum, order) => ({
      speculaaspoppen: sum.speculaaspoppen + order.speculaaspoppen,
      stroopwafels: sum.stroopwafels + order.stroopwafels,
      glutenvrij: sum.glutenvrij + order.glutenvrij,
      lactosevrij: sum.lactosevrij + order.lactosevrij,
    }),
    { speculaaspoppen: 0, stroopwafels: 0, glutenvrij: 0, lactosevrij: 0 },
  )
  return {
    counts,
    revenue: activeOrders.value.reduce((sum, order) => sum + order.total_cents, 0),
    given: sellerDeliveryStats.value.deliveredSellerCount,
  }
})
const sellerPayments = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('nl-NL')
  return sellers.value
    .map((seller) => {
      const sellerName = seller.display_name ?? ''
      const sellerMatches = sellerName.toLocaleLowerCase('nl-NL').includes(term)
      const sellerOrders = orders.value.filter((order) => {
        if (order.seller_id !== seller.id || (!includeCancelled.value && order.cancelled)) return false
        if (!term || sellerMatches) return true
        return `${order.customer_name} ${order.address ?? ''}`
          .toLocaleLowerCase('nl-NL')
          .includes(term)
      })
      const totalCents = activeOrders.value
        .filter((order) => order.seller_id === seller.id)
        .reduce((sum, order) => sum + order.total_cents, 0)
      const activeSellerOrders = activeOrders.value.filter((order) => order.seller_id === seller.id)
      const paidTotalCents = Number(seller.paid_total_cents)
      return {
        id: seller.id,
        seller,
        orders: sellerOrders,
        orderCount: activeSellerOrders.length,
        totalCents,
        paidTotalCents,
        outstandingCents: Math.max(totalCents - paidTotalCents, 0),
        isPaid: totalCents > 0 && paidTotalCents >= totalCents,
        delivered: activeSellerOrders.length > 0 && activeSellerOrders.every((order) => order.given),
        matchesSearch: !term || sellerMatches || sellerOrders.length > 0,
      }
    })
    .filter(({ matchesSearch, orders: sellerOrders, totalCents, paidTotalCents }) =>
      matchesSearch && (sellerOrders.length > 0 || totalCents > 0 || paidTotalCents > 0),
    )
})

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await fetchCommissionData()
    orders.value = result.orders
    sellers.value = result.sellers
    for (const seller of sellers.value) {
      sellerNameDrafts[seller.id] = seller.display_name ?? ''
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Overzicht niet geladen',
      detail: error instanceof Error ? error.message : 'Controleer de verbinding.',
      life: 6000,
    })
  } finally {
    loading.value = false
  }
}

async function setSellerDelivered(sellerId: string, given: boolean): Promise<void> {
  updatingPaymentSellerId.value = sellerId
  try {
    await setSellerOrdersGiven(sellerId, given)
    for (const order of orders.value) {
      if (order.seller_id === sellerId && !order.cancelled) order.given = given
    }
    toast.add({
      severity: 'success',
      summary: given ? 'Verkoperspakket als uitgedeeld afgevinkt' : 'Uitdelen weer opengezet',
      life: 3500,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Uitdelen niet bijgewerkt',
      detail: error instanceof Error ? error.message : 'Probeer het opnieuw.',
      life: 5000,
    })
  } finally {
    updatingPaymentSellerId.value = null
  }
}

function toggleSellerExpanded(sellerId: string): void {
  expandedSellerRows.value[sellerId] = !expandedSellerRows.value[sellerId]
}

async function cancelOrder(order: SaleOrder): Promise<void> {
  if (!window.confirm(`Bestelling van ${order.customer_name} annuleren?`)) return
  try {
    await updateOrder(order.id, { cancelled: true })
    order.cancelled = true
    toast.add({ severity: 'success', summary: 'Bestelling geannuleerd', life: 3000 })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Annuleren mislukt',
      detail: error instanceof Error ? error.message : 'Probeer het opnieuw.',
      life: 5000,
    })
  }
}

function openEdit(order: SaleOrder): void {
  editing.value = order
  editBuyer.value = order.customer_name
  editAddress.value = order.address ?? ''
  Object.assign(editCounts, {
    speculaaspoppen: order.speculaaspoppen,
    stroopwafels: order.stroopwafels,
    glutenvrij: order.glutenvrij,
    lactosevrij: order.lactosevrij,
  })
  editVisible.value = true
}

async function saveEdit(): Promise<void> {
  if (!editing.value || saving.value) return
  saving.value = true
  try {
    await updateOrder(editing.value.id, {
      customer_name: editBuyer.value.trim(),
      address: editAddress.value.trim() || null,
      ...editCounts,
    })
    await load()
    editVisible.value = false
    toast.add({ severity: 'success', summary: 'Bestelling bijgewerkt', life: 3000 })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Wijzigen mislukt',
      detail: error instanceof Error ? error.message : 'Controleer de invoer.',
      life: 6000,
    })
  } finally {
    saving.value = false
  }
}

async function saveSellerName(seller: SellerProfile): Promise<void> {
  const nextName = sellerNameDrafts[seller.id]?.trim()
  if (!nextName || nextName === seller.display_name) return
  try {
    await updateSellerName(seller.id, nextName)
    seller.display_name = nextName
    toast.add({ severity: 'success', summary: 'Ranglijstnaam bijgewerkt', life: 3000 })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Naam niet bijgewerkt',
      detail: error instanceof Error ? error.message : 'Probeer het opnieuw.',
      life: 5000,
    })
  }
}

async function toggleSellerPaid(seller: SellerProfile, isPaid: boolean): Promise<void> {
  updatingPaymentSellerId.value = seller.id
  try {
    seller.paid_total_cents = await setSellerPaid(seller.id, !isPaid)
    toast.add({
      severity: 'success',
      summary: isPaid ? 'Betaling weer opengezet' : 'Totaal als betaald afgevinkt',
      life: 3500,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Betaling niet bijgewerkt',
      detail: error instanceof Error ? error.message : 'Probeer het opnieuw.',
      life: 5000,
    })
  } finally {
    updatingPaymentSellerId.value = null
  }
}

onMounted(() => void load())
</script>

<template>
  <div class="commission-page">
    <div class="stats-grid">
      <Card class="stat-card stat-revenue">
        <template #content>
          <span class="stat-label">Totale opbrengst</span>
          <strong>{{ formatCurrency(totals.revenue) }}</strong>
          <small>{{ activeOrders.length }} actieve bestellingen</small>
        </template>
      </Card>
      <Card class="stat-card">
        <template #content>
          <span class="stat-label">Speculaaspoppen</span>
          <strong>{{ totals.counts.speculaaspoppen }}</strong>
          <small>stuks besteld</small>
        </template>
      </Card>
      <Card class="stat-card">
        <template #content>
          <span class="stat-label">Pakjes stroopwafels</span>
          <strong>{{ totals.counts.stroopwafels + totals.counts.glutenvrij + totals.counts.lactosevrij }}</strong>
          <small>{{ totals.counts.stroopwafels }} gewoon · {{ totals.counts.glutenvrij }} glutenvrij · {{ totals.counts.lactosevrij }} lactosevrij</small>
        </template>
      </Card>
      <Card class="stat-card">
        <template #content>
          <span class="stat-label">Verkopers met alles uitgedeeld</span>
          <strong>{{ totals.given }}<small class="stat-denominator"> / {{ sellerDeliveryStats.sellerCount }}</small></strong>
          <small>verkopers met minstens één bestelling</small>
        </template>
      </Card>
    </div>

    <Card class="commission-card">
      <template #content>
        <div class="section-title table-heading">
          <div>
            <p class="eyebrow">Verwerking en uitdelen</p>
            <h2>Bestellingen en betalingen</h2>
          </div>
          <div class="table-controls">
            <InputText v-model="search" placeholder="Zoek verkoper of koper" aria-label="Zoek in bestellingen" />
            <Button label="Vernieuwen" icon="pi pi-refresh" severity="secondary" outlined @click="load" />
          </div>
        </div>
        <div class="filter-row">
          <label class="checkbox-label">
            <input v-model="includeCancelled" type="checkbox" />
            Toon ook geannuleerde bestellingen
          </label>
        </div>
        <DataTable
          data-key="id"
          v-model:expanded-rows="expandedSellerRows"
          :value="sellerPayments"
          :loading="loading"
          paginator
          :rows="10"
          :rows-per-page-options="[10, 25, 50]"
          striped-rows
          responsive-layout="scroll"
          empty-message="Nog geen bestellingen."
          class="orders-table"
        >
          <Column expander style="width: 3rem" />
          <Column header="Verkoper" sortable sort-field="seller.display_name">
            <template #body="{ data }">{{ data.seller.display_name ?? 'Naam ontbreekt' }}</template>
          </Column>
          <Column field="orderCount" header="Bestellingen" sortable>
            <template #body="{ data }">{{ data.orderCount }}</template>
          </Column>
          <Column field="totalCents" header="Verkooptotaal" sortable>
            <template #body="{ data }">{{ formatCurrency(data.totalCents) }}</template>
          </Column>
          <Column field="outstandingCents" header="Openstaand" sortable>
            <template #body="{ data }">{{ formatCurrency(data.outstandingCents) }}</template>
          </Column>
          <Column header="Betaald">
            <template #body="{ data }">
              <label class="checkbox-label seller-payment-toggle">
                <input
                  type="checkbox"
                  :checked="data.isPaid"
                  :disabled="updatingPaymentSellerId !== null || data.totalCents === 0"
                  :aria-label="data.isPaid
                    ? `Zet betaling van ${data.seller.display_name ?? 'de verkoper'} terug op openstaand`
                    : `Markeer betaling van ${data.seller.display_name ?? 'de verkoper'} als betaald`"
                  @change="toggleSellerPaid(data.seller, data.isPaid)"
                />
                {{ data.isPaid ? 'Ja' : 'Nee' }}
              </label>
            </template>
          </Column>
          <Column header="Alles uitgedeeld">
            <template #body="{ data }">
              <label class="checkbox-label seller-payment-toggle">
                <input
                  type="checkbox"
                  :checked="data.delivered"
                  :disabled="updatingPaymentSellerId !== null || data.orderCount === 0"
                  :aria-label="data.delivered
                    ? `Zet uitdelen voor ${data.seller.display_name ?? 'de verkoper'} terug op openstaand`
                    : `Markeer dat alles voor ${data.seller.display_name ?? 'de verkoper'} is uitgedeeld`"
                  @change="setSellerDelivered(data.seller.id, !data.delivered)"
                />
                {{ data.delivered ? 'Ja' : 'Nee' }}
              </label>
            </template>
          </Column>
          <template #expansion="{ data }">
            <div class="seller-order-expansion">
              <h3>Bestellingen van {{ data.seller.display_name ?? 'deze verkoper' }}</h3>
              <article
                v-for="order in data.orders"
                :key="order.id"
                class="seller-order-detail"
                :class="{ 'seller-order-cancelled': order.cancelled }"
              >
                <div class="seller-order-main">
                  <div class="seller-order-buyer">
                    <strong>{{ order.customer_name }}</strong>
                    <small>{{ formatDate(order.created_at) }}<template v-if="order.address"> · {{ order.address }}</template></small>
                  </div>
                  <span class="order-detail">
                    {{ [
                      order.speculaaspoppen && `${order.speculaaspoppen} pop`,
                      order.stroopwafels && `${order.stroopwafels} gewoon`,
                      order.glutenvrij && `${order.glutenvrij} glutenvrij`,
                      order.lactosevrij && `${order.lactosevrij} lactosevrij`,
                    ].filter(Boolean).join(' · ') }}
                  </span>
                  <div class="seller-order-amount">
                    <strong>{{ formatCurrency(order.total_cents) }}</strong>
                    <span v-if="calculateDiscountCents(order) > 0" class="order-discount">
                      − {{ formatCurrency(calculateDiscountCents(order)) }} korting
                    </span>
                  </div>
                  <div class="seller-order-actions">
                    <Button
                      icon="pi pi-pencil"
                      text
                      rounded
                      severity="secondary"
                      aria-label="Bestelling wijzigen"
                      @click="openEdit(order)"
                    />
                    <Button
                      v-if="!order.cancelled"
                      icon="pi pi-ban"
                      text
                      rounded
                      severity="danger"
                      aria-label="Bestelling annuleren"
                      @click="cancelOrder(order)"
                    />
                    <Tag v-else value="Geannuleerd" severity="danger" />
                  </div>
                </div>
              </article>
              <p v-if="data.orders.length === 0" class="muted">Geen bestellingen bij deze verkoper gevonden.</p>
            </div>
          </template>
        </DataTable>
        <div v-if="loading && sellerPayments.length === 0" class="loading-state seller-mobile-state">
          <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Overzicht laden…
        </div>
        <div v-else-if="sellerPayments.length === 0" class="empty-state seller-mobile-state">
          Nog geen bestellingen.
        </div>
        <div v-else class="seller-mobile-list">
          <Card v-for="payment in sellerPayments" :key="payment.id" class="seller-mobile-card">
            <template #content>
              <div class="seller-mobile-heading">
                <div class="seller-mobile-identity">
                  <button
                    type="button"
                    class="seller-mobile-expand"
                    :aria-expanded="Boolean(expandedSellerRows[payment.id])"
                    @click="toggleSellerExpanded(payment.id)"
                  >
                    <i :class="expandedSellerRows[payment.id] ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" aria-hidden="true"></i>
                    <strong>{{ payment.seller.display_name ?? 'Naam ontbreekt' }}</strong>
                  </button>
                  <small>{{ payment.orderCount }} bestellingen</small>
                </div>
                <strong class="seller-mobile-total">{{ formatCurrency(payment.totalCents) }}</strong>
              </div>
              <div class="seller-mobile-controls">
                <div class="seller-mobile-balance">
                  <span class="stat-label">Openstaand</span>
                  <strong>{{ formatCurrency(payment.outstandingCents) }}</strong>
                </div>
                <label class="seller-mobile-checkbox">
                  <input
                    type="checkbox"
                    :checked="payment.isPaid"
                    :disabled="updatingPaymentSellerId !== null || payment.totalCents === 0"
                    @change="toggleSellerPaid(payment.seller, payment.isPaid)"
                  />
                  Betaald
                </label>
                <label class="seller-mobile-checkbox">
                  <input
                    type="checkbox"
                    :checked="payment.delivered"
                    :disabled="updatingPaymentSellerId !== null || payment.orderCount === 0"
                    @change="setSellerDelivered(payment.seller.id, !payment.delivered)"
                  />
                  Alles uitgedeeld
                </label>
              </div>
              <div v-if="expandedSellerRows[payment.id]" class="seller-mobile-orders">
                <article
                  v-for="order in payment.orders"
                  :key="order.id"
                  class="seller-order-detail"
                  :class="{ 'seller-order-cancelled': order.cancelled }"
                >
                  <div class="seller-order-mobile-top">
                    <div class="seller-order-buyer">
                      <strong>{{ order.customer_name }}</strong>
                      <small>{{ formatDate(order.created_at) }}<template v-if="order.address"> · {{ order.address }}</template></small>
                    </div>
                    <strong>{{ formatCurrency(order.total_cents) }}</strong>
                  </div>
                  <span class="order-detail">
                    {{ [
                      order.speculaaspoppen && `${order.speculaaspoppen} pop`,
                      order.stroopwafels && `${order.stroopwafels} gewoon`,
                      order.glutenvrij && `${order.glutenvrij} glutenvrij`,
                      order.lactosevrij && `${order.lactosevrij} lactosevrij`,
                    ].filter(Boolean).join(' · ') }}
                  </span>
                  <div class="seller-order-actions">
                    <Button
                      icon="pi pi-pencil"
                      text
                      rounded
                      severity="secondary"
                      aria-label="Bestelling wijzigen"
                      @click="openEdit(order)"
                    />
                    <Button
                      v-if="!order.cancelled"
                      icon="pi pi-ban"
                      text
                      rounded
                      severity="danger"
                      aria-label="Bestelling annuleren"
                      @click="cancelOrder(order)"
                    />
                    <Tag v-else value="Geannuleerd" severity="danger" />
                  </div>
                </article>
                <p v-if="payment.orders.length === 0" class="muted">Geen bestellingen bij deze verkoper gevonden.</p>
              </div>
            </template>
          </Card>
        </div>
      </template>
    </Card>

    <Card class="commission-card seller-names-card">
      <template #content>
        <div class="section-title">
          <div>
            <p class="eyebrow">Openbare ranglijst</p>
            <h2>Ranglijstnamen corrigeren</h2>
          </div>
        </div>
        <p class="muted">Corrigeer typefouten of dubbele namen. Gelijke namen worden in de ranglijst samengevoegd.</p>
        <div class="seller-name-list">
          <div v-for="seller in sellers" :key="seller.id" class="seller-name-row">
            <InputText v-model="sellerNameDrafts[seller.id]" maxlength="32" :aria-label="`Ranglijstnaam ${seller.display_name ?? ''}`" />
            <Button
              label="Opslaan"
              icon="pi pi-check"
              severity="secondary"
              outlined
              :disabled="!sellerNameDrafts[seller.id]?.trim() || sellerNameDrafts[seller.id]?.trim() === seller.display_name"
              @click="saveSellerName(seller)"
            />
          </div>
        </div>
      </template>
    </Card>

    <Dialog v-model:visible="editVisible" modal header="Bestelling corrigeren" :style="{ width: 'min(38rem, 94vw)' }">
      <form class="edit-form" @submit.prevent="saveEdit">
        <div class="field">
          <label for="edit-customer">Naam koper</label>
          <InputText id="edit-customer" v-model="editBuyer" maxlength="100" required />
        </div>
        <div class="field">
          <label for="edit-address">Adres (optioneel)</label>
          <InputText id="edit-address" v-model="editAddress" maxlength="250" />
        </div>
        <div class="edit-count-grid">
          <div class="field"><label for="edit-pop">Speculaaspoppen</label><InputNumber input-id="edit-pop" v-model="editCounts.speculaaspoppen" :min="0" :max="50" show-buttons /></div>
          <div class="field"><label for="edit-regular">Gewone pakjes</label><InputNumber input-id="edit-regular" v-model="editCounts.stroopwafels" :min="0" :max="50" show-buttons /></div>
          <div class="field"><label for="edit-gluten">Glutenvrije pakjes</label><InputNumber input-id="edit-gluten" v-model="editCounts.glutenvrij" :min="0" :max="50" show-buttons /></div>
          <div class="field"><label for="edit-lactose">Lactosevrije pakjes</label><InputNumber input-id="edit-lactose" v-model="editCounts.lactosevrij" :min="0" :max="50" show-buttons /></div>
        </div>
        <div class="dialog-total">
          Nieuw totaal: <strong>{{ formatCurrency(calculateTotalCents(editCounts)) }}</strong>
        </div>
        <p class="muted tiny-note">De database controleert opnieuw de aantallen en het maximum van € 200.</p>
        <div class="dialog-actions">
          <Button type="button" label="Annuleren" severity="secondary" text @click="editVisible = false" />
          <Button type="submit" label="Wijzigingen opslaan" icon="pi pi-check" :loading="saving" :disabled="!editBuyer.trim()" />
        </div>
      </form>
    </Dialog>
  </div>
</template>
