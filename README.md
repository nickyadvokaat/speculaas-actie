# De Linge/PCG speculaasactie

Mobiele bestelapp voor de jaarlijkse speculaasactie. De frontend gebruikt Vue
3, Vue Router en PrimeVue; Supabase verzorgt magic-link-authenticatie, opslag,
toegangsregels en de openbare ranglijst. Database migrations worden vanuit
`supabase/migrations/` met Supabase GitHub Integration beheerd.

## Lokaal starten

1. Installeer Node.js 22.12 of nieuwer (of Node.js 20.19+).
2. Installeer dependencies met `npm ci`.
3. Maak in Supabase een project en voer
   `supabase/migrations/202611030001_initial_schema.sql` uit via de SQL Editor.
   Voer daarna ook de overige migraties in `supabase/migrations/` op volgorde
   uit, inclusief de migratie voor pakket-uitdeling.
4. Kopieer `.env.example` naar `.env.local` en vul de Supabase Project URL en
   de publieke anon/publishable key in.
5. Voeg de lokale URL (bijvoorbeeld `http://localhost:5173/**`) toe aan de
   Supabase Auth URL Configuration bij de toegestane redirect-URL's.
6. Start `npm run dev`.

Voor lokaal testen zonder e-mail kun je in **Authentication → Users** een
testgebruiker met wachtwoord aanmaken en e-mailbevestiging aanvinken. Gebruik
het testaccount in het lokale testaanmeldformulier op de startpagina. Deze
wachtwoordaanmelding is alleen in de ontwikkelversie beschikbaar en wordt niet
in de productiebuild opgenomen. Het profiel wordt automatisch aangemaakt.

De anon/publishable key is bedoeld voor gebruik in een browser. De database-
en Row Level Security-regels in de migratie beschermen bestellingen; zet nooit
de `service_role`- of geheime sleutel in de frontend.

## Commissie-account instellen

Iedereen met toegang tot een e-mailadres kan via de startpagina een
verkopersaccount aanmaken. Laat de commissieleden eerst één keer via de app
aanmelden zodat hun profiel wordt aangemaakt. Geef daarna in de Supabase SQL
Editor alleen de commissieleden de rol `admin`. Zoek het UUID van het account
in **Authentication → Users** en voer per commissielid uit:

```sql
update public.profiles
set role = 'admin'
where id = 'VUL-HIER-HET-USER-UUID-IN';
```

De meegeleverde migratie maakt zelf geen publieke admin-account en bevat geen
commissie-e-mailadres. De rol kan niet vanuit de browser worden aangepast.
Laat het commissielid daarna uit- en opnieuw inloggen zodat de nieuwe rol in
de sessie wordt geladen.

## GitHub Pages

De workflow in `.github/workflows/deploy.yml` bouwt en publiceert de site bij
een push naar `master`. Stel in de repository bij **Settings → Pages** de
deployment source in op **GitHub Actions**. Voeg onder **Settings → Secrets
and variables → Actions → Variables** de volgende repository variables toe:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

In Supabase Auth voeg je ook de GitHub Pages URL toe aan de toegestane
redirect-URL's, zonder `#`-fragment, bijvoorbeeld
`https://nickyadvokaat.github.io/speculaas-actie/`. Gebruik de daadwerkelijke
Pages-URL van de repository. De app gebruikt PKCE en stuurt gebruikers na het
verifiëren van de magic link zelf door naar hun profiel.

## Eerste-versiegedrag

- Verkopers melden zich eenmalig per browser aan via een magic link en kiezen
  een voornaam of bijnaam voor de ranglijst.
- De database valideert de bestelling opnieuw: maximaal 20 per product en
  maximaal € 150 per order. Deze grenzen staan in de migratie en vereisen een
  code-/migratiewijziging om ze aan te passen.
- Gewone stroopwafels: 1 voor € 3,30 of 3 voor € 9,00. Glutenvrij en
  lactosevrij tellen samen voor 3 voor € 12,50; resterende pakjes kosten
  € 4,60 per stuk.
- De app verwerkt geen betalingen; de commissie registreert alleen of het
  verkooptotaal van een verkoper naar de club is overgemaakt.
- De top drie op basis van totale verkoopopbrengst wint cadeaubonnen van
  respectievelijk € 25, € 15 en € 10.
- Verkopers kunnen hun eigen bestelgeschiedenis bekijken. Deze afgeschermde
  weergave bevat geen koperadressen en is niet beschikbaar voor andere verkopers.
- De commissie krijgt toegang na toekenning van de `admin`-rol. De pagina
  ondersteunt totalen, wijzigen/annuleren, ranglijstnaamcorrecties en
  betalingen aftekenen. Uitdelen wordt per verkoper als geheel geregistreerd.
- Nieuwe bestellingen worden vanaf 12 november 2026 geblokkeerd, zowel in de
  app als in de database.
- De commissie kan per verkoper het volledige openstaande verkooptotaal
  afvinken zodra dit naar de club is betaald. Nieuwe verkopen na
  een aftekening worden opnieuw als openstaand bedrag getoond.
- Verkopers bekijken hun eigen totalen en bestelgeschiedenis op de pagina
  **Mijn verkopen**. De commissie kan een volledig verkoperspakket in één keer
  als uitgedeeld aftekenen.
