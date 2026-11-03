# Nikki’s Boetiek verbinden — stap voor stap

Deze handleiding hoort bij de cloudpilot in `app/`. De bestaande zelfstandige proefapp blijft werken. De nieuwe versie gebruikt Supabase voor gegevens, foto's, inloggen en de serveraanroep naar Gemini. Nikki werkt uitsluitend in de boetiek-app, niet in de Supabase-tabellen.

**Begin alleen bij stap 1.** De overige stappen zijn vastgelegd zodat we ze daarna samen kunnen uitvoeren. Er is vanuit deze repository nog geen project aangemaakt, migratie uitgevoerd, AI-aanroep gedaan of website gepubliceerd.

## 1. Maak een gratis testproject

1. Open [Supabase](https://supabase.com/dashboard) en log in, eventueel met GitHub.
2. Maak een organisatie op het **Free**-abonnement als je die nog niet hebt.
3. Kies **New project**, bijvoorbeeld met de naam `nikki-boetiek-test`.
4. Kies een Europese regio en een sterk databasewachtwoord. Bewaar dat in je wachtwoordmanager.
5. Wacht tot het project klaar is.

Je kunt daarna aan Codex melden dat het project klaarstaat. De project-URL is niet geheim. Deel geen databasewachtwoord, Gemini-sleutel, secret key of service_role-sleutel in de chat.

## 2. Voorbereiden op je computer

Gebruik de samengevoegde repository met Node.js 24. Open een terminal in de projectmap:

```sh
npm ci
npm run build
npm run serve
```

Open `http://localhost:4173`. Zonder configuratie meldt de app dat de verbinding nog ingesteld moet worden. De oude proefapp in `concept/nikki-proefapp.html` werkt zelfstandig zonder deze stappen.

## 3. Tabellen en foto-opslag aanmaken

Alleen uitvoeren in het nieuwe lege testproject. Dit wijzigt de database; niet op een bestaande productieomgeving uitproberen.

Open in Supabase de **SQL Editor**, maak een nieuw script en plak de volledige inhoud van [de migratie](../supabase/migrations/202611030001_catalog.sql). Voer het één keer uit. Het script maakt onder andere `garments`, `staff`, `analysis_usage` en de private fotobucket `garment-photos` aan, met toegangsregels.

De migratie staat ook klaar voor gebruik via de Supabase CLI (`db push`). Kies één route. Als je de SQL Editor gebruikt, herhaal dezelfde migratie niet later automatisch via de CLI zonder eerst de migratiehistorie gelijk te trekken.

## 4. Nikki als beheerder toevoegen

1. Maak onder **Authentication → Users** een testgebruiker met e-mailadres en wachtwoord. Gebruik de optie om deze gebruiker te bevestigen. Accountregistratie is niet ingebouwd in de app.
2. Kopieer de UUID van die gebruiker.
3. Voer in de SQL Editor uit, met de echte UUID op de aangegeven plek:

```sql
insert into public.staff (user_id)
values ('PLAK-HIER-DE-GEBRUIKERS-UUID');
```

Die UUID is een identifier, geen wachtwoord. Alleen een account in Authentication aanmaken geeft nog geen beheerrechten. De whitelist `staff` doet dat. Nikki kan vervolgens met e-mail en wachtwoord inloggen. Wachtwoordherstel en accountuitnodigingen via de app volgen later; voor de pilot beheert Martijn de accounts in Supabase.

## 5. Alleen publieke projectgegevens invullen

Open [app/config.js](../app/config.js). Vul de **Project URL** en **Publishable key** uit Supabase in. Een legacy **anon key** werkt ook. Deze gegevens mogen in de browser en in Git; de databaseregels bepalen de toegang.

Vul hier **nooit** een `service_role`, `sb_secret_...` of Gemini API-sleutel in. De Gemini-sleutel hoort uitsluitend bij stap 6.

Bouw opnieuw met `npm run build` en vernieuw de pagina. Log in via **Beheer**. Test eerst handmatig: één kledingstuk met een testfoto invoeren, alle gegevens controleren en opslaan. Na vernieuwen en in een tweede browser moet het stuk opnieuw verschijnen.

## 6. Gemini aansluiten

Deze stap is optioneel voor handmatige invoer. Maak een afzonderlijke Gemini API-sleutel in [Google AI Studio](https://aistudio.google.com/api-keys). Een Gemini-chatabonnement is geen API-tegoed.

De serverfunctie staat in [supabase/functions/analyse](../supabase/functions/analyse/index.ts). Met de Supabase CLI vanuit de projectmap:

```sh
npx supabase login
npx supabase link --project-ref JOUW-PROJECTREF
npx supabase functions deploy analyse
```

`JOUW-PROJECTREF` is het niet-geheime project-ID uit je URL. Supabase-login en configuratie gebeuren op je eigen computer, niet via wachtwoorden in de chat.

Voeg onder **Edge Functions → Secrets** toe:

| Naam | Waarde |
|---|---|
| `GEMINI_API_KEY` | De geheime Gemini API-sleutel |
| `GEMINI_MODEL` | De exacte naam van het beschikbare tekst/beeld-analysemodel dat we kiezen in AI Studio |
| `ALLOWED_ORIGINS` | Eerst `http://localhost:4173`; later de exacte HTTPS-site-URL erbij, gescheiden door een komma |

Supabase levert `SUPABASE_URL` en `SUPABASE_SECRET_KEYS` aan de Edge Function. De functie gebruikt de sleutel met naam `default`; voor oudere projecten ondersteunt zij ook `SUPABASE_SERVICE_ROLE_KEY`. Deze blijven op de server. Geen geheime waarden in Git, CLI-argumenten of screenshots zetten.

De platform-JWT-controle staat voor deze functie uit in `supabase/config.toml`, omdat de functie zelf de bearer-token bij Supabase Auth verifieert en daarna de staff-whitelist controleert. Een publieke API-key alleen is onvoldoende om analyse te starten.

De server accepteert maximaal vier verkleinde foto's per analyse, maximaal 30 aanvragen per beheerder per UTC-dag en maximaal 100 voor het hele project. Ook mislukte AI-pogingen na de quotacheck tellen mee. Deze limiet is geen harde eurogrens; kosten hangen af van het gekozen model en het werkelijke tokenverbruik. Stel bij Google ook budgetmeldingen in en meet eerst tien analyses.

Bij een storing kun je altijd **Liever zelf invullen** gebruiken. De AI vult materiaal, bontsoort en periode bewust niet in. Foto's alleen bewijzen deze kenmerken niet. Alle voorstellen blijven onder menselijke controle; de server publiceert nooit op basis van een AI-resultaat alleen.

## 7. Online proefomgeving

Voorstel: Cloudflare Pages met deze GitHub-repository, buildopdracht `npm run build`, uitvoermap `dist/cloud`, Node.js 24. De Edge Function draait bij Supabase. Een gewone statische websitehost is daarom voldoende voor het scherm zelf.

Er is nog niets gehost. Controleer vóór publicatie de publieke configuratie en voeg de exacte site-origin toe aan `ALLOWED_ORIGINS`. De collectie is na publicatie leesbaar voor bezoekers; alleen de invoer vraagt beheerrechten. Gebruik in de testomgeving uitsluitend stukken en foto's die als test zichtbaar mogen zijn.

Preview-URL's zijn niet automatisch toegestaan voor AI. Voeg alleen een concrete test-origin toe; gebruik geen wildcard. Bewaar productiesleutels buiten een Gemini Canvas-export. De cloudapp wordt als website gebruikt; Gemini blijft een hulpmiddel voor ontwerp en code.

## Wanneer is deze stap klaar?

- Handmatige invoer, fotoanalyse en correctie werken met Nikki's testaccount.
- Na sluiten en opnieuw openen staan de stukken en foto's er nog, ook op een tweede apparaat.
- Een bezoeker ziet alleen beschikbare stukken en kan niets wijzigen.
- Opnieuw opslaan werkt hetzelfde stuk bij; een oude versie geeft een conflictmelding.
- Verkocht markeren verwijdert het stuk uit de beschikbare collectie. Latere tekstwijzigingen maken het niet opnieuw beschikbaar.
- Alle vijf stijlen werken.

Pas na de controles met echte Supabase- en Gemini-verbindingen noemen we de cloudverbinding bewezen. De lokale tests gebruiken een PostgreSQL-testengine en nagebootste netwerkdiensten.

## Wat nog niet is aangesloten

Checkout, betaling, orders, reserveringen, klantaccounts, e-mail, retouren, volledige back-up/herstelprocedure en synchronisatie met een winkelplatform. `sold` is in deze pilot een handmatige catalogusstatus; het voorkomt geen dubbelverkoop via een betaalproces. Daarvoor blijft later een winkelplatform leidend.

Niet-opgeslagen invoer vervalt bij verversen of uitloggen. De app vernieuwt de collectie op aanvraag en elke 45 minuten als het tabblad zichtbaar is; dit is geen realtime voorraadgarantie. Getekende foto-URL's kunnen na verkocht markeren nog tot één uur geldig blijven. Ongebruikte uploads na een afgebroken invoer blijven privé; automatische opruiming volgt later. Bestaande foto's worden bij bewerken hergebruikt. Er is nog geen automatische import van de lokale demoartikelen.

## Raming

Voor testen: Supabase Free, statische hosting gratis binnen de geldende voorwaarden, Gemini gratis waar het model/account dat toestaat of naar gebruik. Voor dagelijks gebruik was de werkbegroting €35–50 per maand, exclusief btw, ontwikkelwerk, betaaltransacties en eventueel meerverbruik. Controleer vóór abonnementen [Supabase](https://supabase.com/pricing), [Cloudflare](https://developers.cloudflare.com/pages/functions/pricing/) en [Google](https://ai.google.dev/gemini-api/docs/pricing). Er zijn geen abonnementen afgesloten.
