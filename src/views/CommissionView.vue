<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { fetchCommissionData, updateOrder, updateSellerName } from '../lib/data'
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
const sellerNameDrafts = reactive<Record<string, string>>({})

const activeOrders = computed(() => orders.value.filter((order) => !order.cancelled))
const visibleOrders = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('nl-NL')
  return orders.value.filter((order) => {
    if (!includeCancelled.value && order.cancelled) return false
    const sellerName = sellerById.value[order.seller_id]?.display_name ?? ''
    return !term || `${order.customer_name} ${order.address ?? ''} ${sellerName}`.toLocaleLowerCase('nl-NL').includes(term)
  })
})
const sellerById = computed(() =>
  Object.fromEntries(sellers.value.map((seller) => [seller.id, seller])),
)
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
    given: activeOrders.value.filter((order) => order.given).length,
  }
})

function sellerName(order: SaleOrder): string {
  return sellerById.value[order.seller_id]?.display_name ?? 'Onbekende verkoper'
}

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

async function setGiven(order: SaleOrder, given: boolean): Promise<void> {
  try {
    await updateOrder(order.id, { given })
    order.given = given
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Aftekenen mislukt',
      detail: error instanceof Error ? error.message : 'Probeer het opnieuw.',
      life: 5000,
    })
  }
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
          <span class="stat-label">Meegegeven</span>
          <strong>{{ totals.given }}<small class="stat-denominator"> / {{ activeOrders.length }}</small></strong>
          <small>bestellingen afgetekend</small>
        </template>
      </Card>
    </div>

    <Card class="commission-card">
      <template #content>
        <div class="section-title table-heading">
          <div>
            <p class="eyebrow">Verwerking en uitdelen</p>
            <h2>Bestellingen</h2>
          </div>
          <div class="table-controls">
            <InputText v-model="search" placeholder="Zoek koper of verkoper" aria-label="Zoek in bestellingen" />
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
          :value="visibleOrders"
          :loading="loading"
          paginator
          :rows="10"
          :rows-per-page-options="[10, 25, 50]"
          striped-rows
          responsive-layout="scroll"
          empty-message="Nog geen bestellingen."
          class="orders-table"
        >
          <Column field="created_at" header="Ingevoerd" sortable>
            <template #body="{ data }">{{ formatDate(data.created_at) }}</template>
          </Column>
          <Column header="Verkoper" sortable sort-field="seller_id">
            <template #body="{ data }">{{ sellerName(data) }}</template>
          </Column>
          <Column field="customer_name" header="Koper" sortable />
          <Column field="address" header="Adres">
            <template #body="{ data }">{{ data.address || '—' }}</template>
          </Column>
          <Column header="Bestelling">
            <template #body="{ data }">
              <span class="order-detail">
                {{ data.speculaaspoppen ? `${data.speculaaspoppen} pop · ` : '' }}
                {{ data.stroopwafels ? `${data.stroopwafels} gewoon · ` : '' }}
                {{ data.glutenvrij ? `${data.glutenvrij} glutenvrij · ` : '' }}
                {{ data.lactosevrij ? `${data.lactosevrij} lactosevrij` : '' }}
              </span>
            </template>
          </Column>
          <Column field="total_cents" header="Totaal" sortable>
            <template #body="{ data }">{{ formatCurrency(data.total_cents) }}</template>
          </Column>
          <Column header="Korting">
            <template #body="{ data }">
              <span v-if="calculateDiscountCents(data) > 0" class="order-discount">
                − {{ formatCurrency(calculateDiscountCents(data)) }}
              </span>
              <span v-else class="muted">—</span>
            </template>
          </Column>
          <Column header="Meegegeven">
            <template #body="{ data }">
              <Button
                :label="data.given ? 'Meegegeven' : 'Open'"
                :icon="data.given ? 'pi pi-check' : 'pi pi-box'"
                :severity="data.given ? 'success' : 'secondary'"
                :outlined="!data.given"
                size="small"
                :disabled="data.cancelled"
                @click="setGiven(data, !data.given)"
              />
            </template>
          </Column>
          <Column header="Acties">
            <template #body="{ data }">
              <div class="row-actions">
                <Button icon="pi pi-pencil" text rounded severity="secondary" aria-label="Bestelling wijzigen" @click="openEdit(data)" />
                <Button
                  v-if="!data.cancelled"
                  icon="pi pi-ban"
                  text
                  rounded
                  severity="danger"
                  aria-label="Bestelling annuleren"
                  @click="cancelOrder(data)"
                />
                <Tag v-else value="Geannuleerd" severity="danger" />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <Card class="commission-card seller-names-card">
      <template #content>
        <div class="section-title">
          <div>
            <p class="eyebrow">Openbare ranglijst</p>
            <h2>Verkopersnamen beheren</h2>
          </div>
        </div>
        <p class="muted">Pas een naam aan om dubbele of verkeerd gespelde ranglijstnamen te corrigeren. Gelijke namen worden in de ranglijst samengevoegd.</p>
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
          <div class="field"><label for="edit-pop">Speculaaspoppen</label><InputNumber input-id="edit-pop" v-model="editCounts.speculaaspoppen" :min="0" :max="20" show-buttons /></div>
          <div class="field"><label for="edit-regular">Gewone pakjes</label><InputNumber input-id="edit-regular" v-model="editCounts.stroopwafels" :min="0" :max="20" show-buttons /></div>
          <div class="field"><label for="edit-gluten">Glutenvrije pakjes</label><InputNumber input-id="edit-gluten" v-model="editCounts.glutenvrij" :min="0" :max="20" show-buttons /></div>
          <div class="field"><label for="edit-lactose">Lactosevrije pakjes</label><InputNumber input-id="edit-lactose" v-model="editCounts.lactosevrij" :min="0" :max="20" show-buttons /></div>
        </div>
        <div class="dialog-total">
          Nieuw totaal: <strong>{{ formatCurrency(calculateTotalCents(editCounts)) }}</strong>
        </div>
        <p class="muted tiny-note">De database controleert opnieuw de aantallen en het maximum van € 150.</p>
        <div class="dialog-actions">
          <Button type="button" label="Annuleren" severity="secondary" text @click="editVisible = false" />
          <Button type="submit" label="Wijzigingen opslaan" icon="pi pi-check" :loading="saving" :disabled="!editBuyer.trim()" />
        </div>
      </form>
    </Dialog>
  </div>
</template>
