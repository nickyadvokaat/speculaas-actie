# De Linge PCG speculaasactie

Mobiele bestelapp voor de jaarlijkse speculaasactie. De frontend gebruikt Vue
3, Vue Router en PrimeVue; Supabase verzorgt magic-link-authenticatie, opslag,
toegangsregels en de openbare ranglijst. Database migrations worden vanuit
`supabase/migrations/` met Supabase GitHub Integration beheerd.

## Lokaal starten

1. Installeer Node.js 22.12 of nieuwer (of Node.js 20.19+).
2. Installeer dependencies met `npm ci`.
3. Maak in Supabase een project en voer
   `supabase/migrations/202611030001_initial_schema.sql` uit via de SQL Editor.
4. Kopieer `.env.example` naar `.env.local` en vul de Supabase Project URL en
   de publieke anon/publishable key in.
5. Voeg de lokale URL (bijvoorbeeld `http://localhost:5173/**`) toe aan de
   Supabase Auth URL Configuration bij de toegestane redirect-URL's.
6. Start `npm run dev`.

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
- Er is geen betaalverwerking of registratie van betaalstatus.
- De commissie krijgt toegang na toekenning van de `admin`-rol. De pagina
  ondersteunt totalen, wijzigen/annuleren, naamcorrecties en aftekenen als
  meegegeven.
