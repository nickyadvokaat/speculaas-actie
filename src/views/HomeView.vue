<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { authState, requestMagicLink, signInForDevelopment } from '../stores/auth'
import { isSupabaseConfigured } from '../lib/supabase'

const email = ref('')
const password = ref('')
const sending = ref(false)
const signingIn = ref(false)
const linkSent = ref(false)
const toast = useToast()
const isDevelopment = import.meta.env.DEV
const baseUrl = import.meta.env.BASE_URL

async function sendLink(): Promise<void> {
  if (!email.value.trim()) return
  sending.value = true
  try {
    await requestMagicLink(email.value.trim())
    linkSent.value = true
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Aanmelden mislukt',
      detail: error instanceof Error ? error.message : 'Probeer het opnieuw.',
      life: 5000,
    })
  } finally {
    sending.value = false
  }
}

async function signInWithTestPassword(): Promise<void> {
  signingIn.value = true
  try {
    await signInForDevelopment(email.value.trim(), password.value)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Testaanmelding mislukt',
      detail: error instanceof Error ? error.message : 'Probeer het opnieuw.',
      life: 5000,
    })
  } finally {
    signingIn.value = false
  }
}
</script>

<template>
  <section class="hero-grid">
    <div class="hero-copy">
      <p class="eyebrow">Een warme actie voor onze club</p>
      <h1>De lekkerste manier om <span>De Linge/PCG</span> te steunen.</h1>
      <p class="hero-description">
        Verkoop speculaaspoppen en stroopwafels. Voer je bestellingen eenvoudig
        in en volg de opbrengst op de ranglijst.
      </p>
      <div v-if="authState.user" class="welcome-card">
        <div class="welcome-icon"><i class="pi pi-check" aria-hidden="true"></i></div>
        <div>
          <strong>Welkom{{ authState.profile?.display_name ? `, ${authState.profile.display_name}` : '' }}!</strong>
          <p>Je bent aangemeld. Je kunt nu bestellingen invoeren.</p>
        </div>
        <RouterLink class="text-action" to="/bestellen">Bestellen <i class="pi pi-arrow-right" aria-hidden="true"></i></RouterLink>
      </div>
    </div>

    <Card class="login-card" v-if="!authState.user">
      <template #title>
        <span class="card-icon"><i class="pi pi-envelope" aria-hidden="true"></i></span>
        <span>Verkoper aanmelden</span>
      </template>
      <template #subtitle>
        Meld je eenmalig aan met je e-mailadres. Je krijgt een veilige inloglink.
      </template>
      <template #content>
        <form class="stack-form" @submit.prevent="sendLink">
          <label for="seller-email">E-mailadres</label>
          <InputText
            id="seller-email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="jij@voorbeeld.nl"
            required
            :disabled="!isSupabaseConfigured || sending"
          />
          <Button
            type="submit"
            label="Stuur mij een inloglink"
            icon="pi pi-arrow-right"
            icon-pos="right"
            :loading="sending"
            :disabled="!isSupabaseConfigured"
          />
        </form>
        <Message v-if="linkSent" severity="success" :closable="false" class="form-message">
          Check je inbox en open de link op dit apparaat.
        </Message>
        <Message v-if="authState.error" severity="error" :closable="false" class="form-message">
          {{ authState.error }}
        </Message>
        <form
          v-if="isDevelopment && isSupabaseConfigured"
          class="stack-form"
          @submit.prevent="signInWithTestPassword"
        >
          <Divider />
          <p class="muted">Lokale testaanmelding (niet beschikbaar op de live site)</p>
          <label for="test-password">Testwachtwoord</label>
          <InputText
            id="test-password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            :disabled="signingIn"
          />
          <Button
            type="submit"
            label="Test lokaal aanmelden"
            icon="pi pi-sign-in"
            :loading="signingIn"
          />
        </form>
        <p class="privacy-note">
          <i class="pi pi-lock" aria-hidden="true"></i>
          Je e-mailadres is niet zichtbaar op de ranglijst.
        </p>
      </template>
    </Card>
    <div v-else class="hero-art" aria-hidden="true">
      <div class="art-sun"></div>
      <div class="art-card">
        <span class="art-label">Samen sterk</span>
        <strong>Een bestelling<br />voor de club</strong>
        <img class="art-product-icon" :src="`${baseUrl}products/speculaaspop-waterpolo.png`" alt="" />
        <span class="art-footer">Speculaasactie 2026</span>
      </div>
      <div class="floating-price">€ 7,-<small>speculaaspop</small></div>
    </div>
  </section>

  <section class="how-it-works">
    <div class="section-title">
      <div>
        <p class="eyebrow">Van verkoop tot overmaken</p>
        <h2>Zo werkt de actie</h2>
      </div>
    </div>
    <div class="how-it-works-steps">
      <article>
        <span>1</span>
        <div>
          <h3>Meld je aan</h3>
          <p>Log in met je e-maillink en kies je naam voor de ranglijst.</p>
        </div>
      </article>
      <article>
        <span>2</span>
        <div>
          <h3>Verkoop en noteer</h3>
          <p>Leg elke bestelling vast, voor jezelf of voor een koper. Zo blijft het totaal overzichtelijk.</p>
        </div>
      </article>
      <article>
        <span>3</span>
        <div>
          <h3>Maak het totaal over</h3>
          <p>Regel de betaling met je kopers en maak jouw verkooptotaal in één keer over naar de club.</p>
        </div>
      </article>
    </div>
    <RouterLink class="text-action how-details-link" to="/hoe-werkt-het">
      Lees hoe betalen en uitdelen werkt <i class="pi pi-arrow-right" aria-hidden="true"></i>
    </RouterLink>
  </section>

  <section class="product-intro">
    <div class="section-title">
      <div>
        <p class="eyebrow">Bestel iets lekkers</p>
        <h2>Voor ieder wat lekkers</h2>
      </div>
      <RouterLink class="text-action" to="/ranglijst">
        Bekijk ranglijst <i class="pi pi-arrow-right" aria-hidden="true"></i>
      </RouterLink>
    </div>
    <div class="product-cards">
      <article class="product-card">
        <img class="product-art" :src="`${baseUrl}products/speculaaspop-waterpolo.png`" alt="" />
        <div><h3>Speculaaspop</h3><p>Ambachtelijk en 500 gram</p></div>
        <strong>€ 7,00</strong>
      </article>
      <article class="product-card">
        <img class="product-art" :src="`${baseUrl}products/stroopwafels.png`" alt="" />
        <div><h3>Stroopwafels</h3><p>10 stuks per pakje · 3 voor € 9,-</p></div>
        <strong>v.a. € 3,30</strong>
      </article>
      <article class="product-card">
        <img class="product-art" :src="`${baseUrl}products/stroopwafels-glutenvrij.png`" alt="" />
        <div><h3>Glutenvrij</h3><p>3 pakjes glutenvrij/lactosevrij samen voor € 12,50</p></div>
        <strong>€ 4,60</strong>
      </article>
      <article class="product-card">
        <img class="product-art" :src="`${baseUrl}products/stroopwafels-lactosevrij.png`" alt="" />
        <div><h3>Lactosevrij</h3><p>Combineren · 3 pakjes voor € 12,50</p></div>
        <strong>€ 4,60</strong>
      </article>
    </div>
  </section>
</template>
