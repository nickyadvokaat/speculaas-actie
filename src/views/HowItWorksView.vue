<template>
  <div class="how-page">
    <section class="how-page-intro">
      <p>
        Met de speculaasactie verkopen we speculaaspoppen en stroopwafels.
        Hieronder lees je hoe bestellen, betalen en uitdelen werkt.
      </p>
    </section>

    <section class="how-page-grid" aria-label="Uitleg van de actie">
      <article class="how-page-card">
        <span class="how-page-icon"><i class="pi pi-user-plus" aria-hidden="true"></i></span>
        <p class="eyebrow">1 · Aanmelden</p>
        <h3>Kies je verkopersnaam</h3>
        <p>Meld je aan met de link in je e-mail en stel een voornaam of bijnaam in. Die naam verschijnt op de ranglijst.</p>
      </article>
      <article class="how-page-card">
        <span class="how-page-icon"><i class="pi pi-shopping-bag" aria-hidden="true"></i></span>
        <p class="eyebrow">2 · Verkopen</p>
        <h3>Plaats je bestellingen</h3>
        <p>Kies of je zelf koopt of aan iemand verkoopt, vul de producten in en controleer het totaal. Korting wordt automatisch berekend.</p>
      </article>
      <article class="how-page-card">
        <span class="how-page-icon"><i class="pi pi-wallet" aria-hidden="true"></i></span>
        <p class="eyebrow">3 · Betalen</p>
        <h3>Reken af met je koper</h3>
        <p>De koper betaalt jou. Na de deadline hoor je hoe je het totaal van jouw verkopen in één keer aan de club overmaakt.</p>
      </article>
      <article class="how-page-card">
        <span class="how-page-icon"><i class="pi pi-box" aria-hidden="true"></i></span>
        <p class="eyebrow">4 · Uitdelen</p>
        <h3>Haal je complete pakket op</h3>
        <p>Je krijgt alles voor jouw verkopen in één keer mee op een training of wedstrijddag. Na de deadline wordt de bestelling bij de leverancier geplaatst, en volgt communicatie over de levering.</p>
      </article>
    </section>

    <Card class="how-payment-card">
      <template #content>
        <p class="eyebrow">Handig om te weten</p>
        <h2>Betaling en voortgang</h2>
        <div class="how-payment-points">
          <p><i class="pi pi-check-circle" aria-hidden="true"></i> Je ziet je verkooptotaal en bestelgeschiedenis bij <strong>Mijn bestellingen</strong>.</p>
          <p><i class="pi pi-check-circle" aria-hidden="true"></i> De commissie vinkt af wanneer jouw totaal is betaald en wanneer je complete pakket is uitgedeeld.</p>
          <p><i class="pi pi-calendar" aria-hidden="true"></i> Nieuwe bestellingen invoeren kan tot zondag 15 november 2026 om 12.00 uur.</p>
          <p><i class="pi pi-lock" aria-hidden="true"></i> Kopergegevens zijn alleen zichtbaar voor de commissie.</p>
        </div>
      </template>
    </Card>

    <div class="how-page-actions">
      <RouterLink class="text-action" to="/bestellen">Bestelling invoeren <i class="pi pi-arrow-right" aria-hidden="true"></i></RouterLink>
      <RouterLink class="text-action" to="/ranglijst">Bekijk de ranglijst <i class="pi pi-arrow-right" aria-hidden="true"></i></RouterLink>
    </div>
  </div>
</template>
