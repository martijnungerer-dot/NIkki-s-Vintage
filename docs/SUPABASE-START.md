# Nikki’s Boetiek verbinden — stap voor stap

Deze handleiding hoort bij de cloudpilot in `app/`. De bestaande zelfstandige proefapp blijft werken. De nieuwe versie gebruikt Supabase voor gegevens, foto's, inloggen en de serveraanroep naar Gemini. Nikki werkt uitsluitend in de boetiek-app, niet in de Supabase-tabellen.

**Stand 4 november 2026:** het bestaande project `naxjrskfdedwvoeltigs` heeft nu de catalogustabellen en privéfoto-opslag. De website draait bij Cloudflare Workers op `nikki-s-vintage.martijnungerer.workers.dev`. De publieke verbinding staat in `app/config.js`; na merge en Cloudflare-deployment is die actief op de website. Er zijn nog geen beheerdersaccounts of kledingstukken aangemaakt en Gemini is nog niet aangesloten.

Voor dit project begin je bij **stap 4**. Maak geen nieuw project en voer de reeds geregistreerde migraties niet opnieuw uit. De stappen hieronder blijven bruikbaar voor een afzonderlijk nieuw testproject.

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

Voor een nieuw leeg project: voer alle SQL-bestanden in [supabase/migrations](../supabase/migrations/) eenmaal in bestandsnaamvolgorde uit. De eerste migratie maakt `garments`, `staff`, `analysis_usage` en de private fotobucket `garment-photos` aan; de opvolgende migratie beperkt ook de rechtstreeks door Supabase toegekende aanroeprechten. Alleen `PUBLIC` intrekken is op zulke projecten niet voldoende.

De migraties kunnen ook via de Supabase CLI worden uitgevoerd. Controleer versie en `--help` voordat je remote commando's gebruikt: CLI v3 richt databasecommando's standaard op lokaal. Als je de SQL Editor gebruikt, herhaal dezelfde migraties niet later automatisch via de CLI zonder eerst de migratiehistorie gelijk te trekken.

De huidige pilot is via de Supabase-koppeling ingericht. De geregistreerde versies zijn `20261104193047_catalog` en `20261104193519_restrict_catalog_access`; de bestandsnamen volgen die remote historie. Het eerste bestand heette eerder `202611030001_catalog.sql` en is inhoudelijk gelijk gebleven. Heb je dat bestand zelf al in een ander project toegepast, stem dan eerst de historie af voordat je latere migraties toepast.

Na inrichting blijven twee typen Advisor-meldingen bewust staan: [authenticated SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), omdat de drie beheer-RPC's eerst de staff-whitelist controleren, en [RLS zonder policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) op `analysis_usage`, omdat alleen de serverfunctie die tabel gebruikt. Anon heeft geen EXECUTE op de beheer-RPC's; browserrollen hebben geen tabelrechten op de analysequota. Deze weigeringen zijn ook in de echte database gecontroleerd. De performance-advisor meldt na de policy-aanpassing geen bevindingen.

## 4. Nikki als beheerder toevoegen

1. Open [Authentication → Users](https://supabase.com/dashboard/project/naxjrskfdedwvoeltigs/auth/users). Kies **Add user → Create new user** en maak een testgebruiker met e-mailadres en wachtwoord. Gebruik de optie om deze gebruiker te bevestigen (**Auto Confirm User**). Bewaar het wachtwoord zelf; deel het niet in de chat. Accountregistratie is niet ingebouwd in de app.
2. Kopieer de UUID van die gebruiker.
3. Voer in de SQL Editor uit, met de echte UUID op de aangegeven plek:

```sql
insert into public.staff (user_id)
values ('PLAK-HIER-DE-GEBRUIKERS-UUID');
```

Die UUID is een identifier, geen wachtwoord. Alleen een account in Authentication aanmaken geeft nog geen beheerrechten. De whitelist `staff` doet dat. Nikki kan vervolgens met e-mail en wachtwoord inloggen. Accountuitnodigingen via de app volgen later; voor de pilot beheert Martijn de accounts in Supabase.

### Wachtwoord vergeten

Het inlogscherm heeft de knop **Wachtwoord vergeten?**. Supabase mailt dan een link die terugkomt op de website, waar Nikki een nieuw wachtwoord kiest (minstens 8 tekens). Eenmalig instellen in [Authentication → URL Configuration](https://supabase.com/dashboard/project/naxjrskfdedwvoeltigs/auth/url-configuration):

1. **Site URL**: `https://nikki-s-vintage.martijnungerer.workers.dev/`
2. Onder **Redirect URLs** dezelfde link toevoegen.

Zonder die instelling stuurt Supabase de link naar een verkeerd adres. De standaardmail van Supabase werkt; die kan later een eigen tekst krijgen onder Authentication → Emails. Supabase verstuurt via de ingebouwde mailserver maar enkele mails per uur; de app meldt dat als er net al een link is gevraagd. De app laat nooit weten of een e-mailadres bekend is.

## 5. Alleen publieke projectgegevens invullen

Voor de huidige pilot zijn de **Project URL** en actieve **Publishable key** al ingevuld in [app/config.js](../app/config.js). Voor een ander project gebruik je diens eigen gegevens uit Supabase. Een legacy **anon key** werkt ook. Deze gegevens mogen in de browser en in Git; de databaseregels bepalen de toegang.

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


### Persoonlijke volgorde (smaakprofiel)

De tweede serverfunctie, [supabase/functions/personalise](../supabase/functions/personalise/handler.mjs), rangschikt de collectie per bezoeker (zie [SMAAKPROFIEL.md](SMAAKPROFIEL.md)). Ze gebruikt dezelfde secrets als hierboven. Nodig: de migratie `20261110210000_personalise_usage.sql` en de uitrol:

```sh
npx supabase db push --remote
npx supabase functions deploy personalise
```

De functie is openbaar (bezoekers loggen niet in), daarom staat de platform-JWT-controle uit in `supabase/config.toml`. Ze controleert zelf de herkomst (`ALLOWED_ORIGINS`), een body van hoogstens 8 kB, en een daglimiet: 20 aanvragen per bezoeker per UTC-dag en 2000 voor het hele project. Een aanvraag zonder voorkeuren telt niet mee. Een bezoeker wordt alleen herkend aan een dagelijks wisselende, versleutelde afgeleide van het IP-adres (bij IPv6 per /64-blok); het IP-adres zelf wordt niet bewaard. De browser stuurt alleen de compacte smaaksamenvatting; de server leest zelf de gepubliceerde stukken. Zonder Gemini-sleutel of bij een storing geeft de functie de lokale volgorde terug, zodat de winkel blijft werken. Met `PERSONALISE_MODEL` kun je een goedkoper model kiezen dan voor fotoanalyse. Volledige stappen, kosten en controle met `npm run check:live`: [LIVEGANG.md](LIVEGANG.md).

## 7. Online proefomgeving

De huidige proefomgeving gebruikt Cloudflare Workers Static Assets: [Nikki's boetiek](https://nikki-s-vintage.martijnungerer.workers.dev). De GitHub-koppeling bouwt `main` met `npm run build` en publiceert `dist/cloud`. Production workers.dev is ingeschakeld; een eigen domein is niet nodig. Cloudflare Pages blijft een alternatief voor een nieuwe omgeving. De latere Gemini Edge Function draait bij Supabase.

Na merge van de verbindingsconfiguratie moet Cloudflare opnieuw succesvol bouwen. Controleer daarna dat **Collectie geladen.** verschijnt. Bij het aansluiten van Gemini voeg je de exacte origin `https://nikki-s-vintage.martijnungerer.workers.dev` toe aan `ALLOWED_ORIGINS`. De collectie is leesbaar voor bezoekers; alleen de invoer vraagt beheerrechten. Gebruik in de testomgeving uitsluitend stukken en foto's die als test zichtbaar mogen zijn.

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

Niet-opgeslagen invoer vervalt bij verversen of uitloggen. De app controleert elke vijf minuten en bij terugkeer naar het tabblad of de fotolinks ouder zijn dan veertig minuten; zo nodig wordt de collectie vernieuwd. Dit is geen realtime voorraadgarantie. Getekende foto-URL's kunnen na verkocht markeren nog tot één uur geldig blijven. Ongebruikte uploads na een afgebroken invoer blijven privé; automatische opruiming volgt later. Bestaande foto's worden bij bewerken hergebruikt. Er is nog geen automatische import van de lokale demoartikelen.

## Raming

Voor testen: Supabase Free, statische hosting gratis binnen de geldende voorwaarden, Gemini gratis waar het model/account dat toestaat of naar gebruik. Voor dagelijks gebruik was de werkbegroting €35–50 per maand, exclusief btw, ontwikkelwerk, betaaltransacties en eventueel meerverbruik. Controleer vóór abonnementen [Supabase](https://supabase.com/pricing), [Cloudflare](https://developers.cloudflare.com/pages/functions/pricing/) en [Google](https://ai.google.dev/gemini-api/docs/pricing). Er zijn geen abonnementen afgesloten.
