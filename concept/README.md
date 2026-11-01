# Websiteconcept (skelet)

[site-skeleton.html](site-skeleton.html) is een werkend skelet van de winkel, geen eindontwerp. Eén HTML-bestand zonder build of externe afbeeldingen. Openen in een browser is genoeg.

- Binnenkomen (`#home`): meteen een carrousel met stukken, nauwelijks tekst. Hartjes op het hele stuk of op losse kenmerken (bontsoort, model, periode, materiaal, lengte, kleur, pasvorm) leren de site wat iemand mooi vindt; na drie hartjes verschijnt de Perfect fit-popup.
- Bladeren (`#browse`): carrousels per groep, bovenaan een persoonlijke rij.
- Productpagina (`#product`): fotocarrousel, prijs, platte maten; conditie en herkomst achter uitklapkopjes.
- Materialen (`#materials`): bontsoorten en materialen in een raster, met hartjes. Missie (`#mission`): korte missietekst (voorstel).
- Perfect fit: popup die om een e-mailadres vraagt, met daarna een plaatshouder voor de AI-meethulp.
- Getekende jassen in plaats van foto's. Alle stukken, prijzen en maten zijn voorbeelden. Het smaak-leren is een demoregel, geen echte machine learning.
- Minimalistisch en bewust neutraal: kleur, letters en sfeer bepaalt Nikki. Paginateksten in het Nederlands. Gele notities (Nederlands) verschijnen via de knop *Notes*.
- Er wordt niets opgeslagen of verstuurd; er is geen checkout.

## Invoerprototype voor Nikki

[intake-prototype.html](intake-prototype.html) laat Nikki ervaren hoe invoeren met AI gaat: foto's van een jas maken of kiezen in willekeurige volgorde, de AI sorteert ze (voorkant, achterkant, label, detail, gebrek, voering, sluiting) en doet voorstellen (titel, materiaal, bontsoort, model, periode, kleur, lengte, pasvorm, staat, beschrijving), goedkeuren met een vinkje per foto of één vinkje voor alle foto's, en de maten met het meetlint invullen. AI is de eerste keuze; zelf invullen is de uitwijkroute. Daarna ziet ze welke voorbeeldklanten een mail zouden krijgen.

- De AI werkt alleen in de gepubliceerde Claude-versie (artifact), op het Claude-account van wie het opent. Als los bestand of in Gemini zit er geen AI in; dan vult ze alles zelf in.
- Er wordt niets opgeslagen, niets verstuurd en niets naar Airtable geschreven. De klanten zijn verzonnen voorbeelden.
- Bij bont is de soort verplicht en moet Nikki aanvinken dat ze die zelf heeft gecontroleerd.

## Verder werken in Gemini

1. Download `site-skeleton.html` uit GitHub (knop *Download raw file*) of krijg het bestand van Martijn.
2. Open Gemini, kies **Canvas**, upload het bestand en vraag Gemini er een webpagina-voorbeeld van te maken.
3. Gebruik bijvoorbeeld deze opdracht:

> Dit is een werkend skelet voor een webshop in vintage bont, leer en shearling. Behoud de structuur en de werkende onderdelen (carrousels, hartjes, Perfect fit-popup). Pas alleen de stijl aan: [jouw wensen, bijv. kleuren, lettertype, sfeer]. Houd je aan de regels in het commentaar bovenaan het bestand: maten plat in cm, bontsoort altijd benoemen maar alleen zoals Nikki die heeft vastgesteld, geen verzonnen claims, alle stukken zijn voorbeelden.

4. Stuur het resultaat (het HTML-bestand of de Gemini-link) naar Martijn. Claude of Codex zet het daarna terug in deze repository.

Gemini heeft geen toegang tot GitHub of Airtable van dit project. Werk daarom met kopieën en lever wijzigingen aan via Martijn.
