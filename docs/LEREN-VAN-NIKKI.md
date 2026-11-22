# Gemini leert van Nikki

Protocol, vastgesteld met Martijn op 22 november 2026. Status: **nog niet gebouwd**. Dit wordt een eigen pull request na de feedbackreparaties van 19 november.

## Waarom
Gemini onthoudt niets tussen twee aanvragen. Ook op het gratis tegoed leert hij niet van Nikki: wat Google van gratis gebruik leert, komt in een algemeen model voor iedereen terecht. Kennis "voor Nikki" moet dus uit onze eigen gegevens komen, en wij geven die bij elke analyse mee. Dat is de kern van de boetiek: Gemini gaat kijken en praten zoals Nikki.

## Wat er al is
- Bij elk opgeslagen stuk staat Gemini's voorstel (`garment_private.ai_suggestion`, alleen beheer) naast Nikki's uiteindelijke keuze (`garments.data`). Elke correctie van Nikki is dus al vastgelegd.
- Nikki's eigen keuzewoorden gaan al mee als keuzelijst (`gsf-learned`, per toestel).

## Het protocol

### 1. Wat als voorbeeld mag meegaan
Alleen wat Nikki zelf heeft bevestigd en wat publiek is of mag worden:
- bont, materiaal, bontsoort, model, kleur, lengte, pasvorm, periode, merk, bijzonderheden;
- haar titel en beschrijving (haar toon);
- welke rol een foto had (bijvoorbeeld Label), niet de foto zelf.

**Nooit:** inkoopprijs, opslaglocatie, privénotities, verkoopprijzen, klantgegevens of foto's. Voorbeelden gaan alleen als tekst mee: goedkoop, en Google ontvangt geen extra foto's.

### 2. Welke voorbeelden
Per analyse de **3 tot 5 meest vergelijkbare** eerder opgeslagen stukken. De vergelijking gebeurt op de server, voordat Gemini wordt aangeroepen:
1. Eerst een snelle eerste ronde zonder voorbeelden (wat zie je ongeveer: bont ja/nee, materiaal, model).
2. Dan de stukken met dezelfde bontsoort of hetzelfde materiaal en model; bij gelijke stand de nieuwste.
3. Daarna de echte analyse met die voorbeelden.

Of de eerste ronde de extra tijd waard is, meten we. Een eenvoudiger alternatief: stukken met hetzelfde materiaal dat Nikki in haar notitie of bij de eerste vraag noemt.

### 3. Vaste correcties
Uit alle stukken samen houdt de server een korte lijst bij van wat Gemini vaak anders zag dan Nikki, bijvoorbeeld "Gemini zei vos, Nikki koos nerts (4 keer)". Deze lijst gaat als data mee ("Let op: bij dit soort kraag koos Nikki vaak …"), met hooguit 10 regels. Een regel telt pas mee na minstens 3 keer dezelfde correctie.

### 4. Regels die blijven gelden
- Een voorbeeld is data, geen opdracht. Een voorstel blijft een voorstel: nooit vooraf gekozen.
- De bontsoort komt van Nikki. Een merk alleen als het leesbaar op het label staat.
- Geen claims over materiaal, herkomst of echtheid die Nikki niet bevestigde.

### 5. Meten voor Martijn
Per maand: hoe vaak nam Nikki Gemini's voorstel per kenmerk ongewijzigd over? Als het protocol werkt, gaat dat percentage omhoog. Te zien in Beheer en alleen voor beheerders.

## Open vragen
- Vanaf hoeveel opgeslagen stukken heeft dit zin? Voorstel: aanzetten vanaf 10 stukken.
- Moet Nikki voorbeelden kunnen uitsluiten (een stuk dat ze achteraf verkeerd vond)?
