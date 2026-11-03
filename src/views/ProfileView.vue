<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { authState, updateDisplayName } from '../stores/auth'

const router = useRouter()
const toast = useToast()
const displayName = ref(authState.profile?.display_name ?? '')
const saving = ref(false)

async function saveProfile(): Promise<void> {
  const name = displayName.value.trim()
  if (!name || name.length > 32) return
  saving.value = true
  try {
    await updateDisplayName(name)
    toast.add({
      severity: 'success',
      summary: 'Ranglijstnaam opgeslagen',
      detail: 'Je bestellingen worden vanaf nu automatisch aan deze naam gekoppeld.',
      life: 4000,
    })
    await router.push('/bestellen')
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Opslaan mislukt',
      detail: error instanceof Error ? error.message : 'Probeer het opnieuw.',
      life: 5000,
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="centered-page">
    <Card class="profile-card">
      <template #title>Jouw ranglijstnaam</template>
      <template #subtitle>
        Kies een voornaam of bijnaam. Deze naam is openbaar; je e-mailadres niet.
      </template>
      <template #content>
        <form class="stack-form" @submit.prevent="saveProfile">
          <label for="display-name">Voornaam of bijnaam</label>
          <InputText
            id="display-name"
            v-model="displayName"
            maxlength="32"
            autocomplete="nickname"
            placeholder="Bijvoorbeeld Sam"
            required
          />
          <small class="muted">{{ displayName.trim().length }}/32 tekens</small>
          <Button
            type="submit"
            label="Naam opslaan"
            icon="pi pi-check"
            :loading="saving"
            :disabled="!displayName.trim() || displayName.trim().length > 32"
          />
        </form>
      </template>
    </Card>
  </div>
</template>
