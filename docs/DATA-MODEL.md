# Airtable-inrichting

De base [Nikki Vintage — Inventory](https://airtable.com/appcR1TGKaoc4XAU4) staat in **My First Workspace**. De technische velddefinities staan in [schema.json](../airtable/schema.json); echte identifiers staan in [connection.json](../airtable/connection.json).

## Tabellen en relaties

| Tabel | Eén record staat voor | Sleutel | Relatie |
|---|---|---|---|
| Garments | Eén fysiek kledingstuk | SKU, uniek en onveranderlijk | Eén meetset, meerdere foto's |
| Measurements | De huidige gecontroleerde meetset | Measurement key | Precies één Garment |
| Media | Eén foto | Media key | Precies één Garment |

Airtable-linkvelden kunnen technisch meerdere records toelaten. De toekomstige publisher moet precies één kledingstuk per meetset/foto en één meetset per kledingstuk afdwingen. SKU- en slug-uniciteit worden evenmin door een tekstveld afgedwongen. Controleer vóór invoer op dubbele SKU; de publisher moet bij dubbelen stoppen.

Gebruik oplopende SKU's zoals `NV-000001`; nooit een code hergebruiken. Voorbeelden in de documentatie zijn geen bestaande voorraad. De base is leeg opgeleverd.

## Garments

- Identiteit en verkooptekst: SKU, Title, Slug, Category, Material, Species, Material evidence, Brand, Era notes, Colour, Label size, Fit notes, Description.
- Inspectie: Condition, Condition notes, Sale eligibility.
- Prijsvoorstel: Draft price minor en Currency. Integer eurocenten: 12500 staat voor €125,00. Nog geen checkoutprijs.
- Redactie: Editorial status (`draft`, `review`, `ready`, `published`, `withdrawn`, `archived`). Leeg behandelen als draft. Nikki gebruikt ready; published wordt later alleen door de publisher gezet.
- Privé: Provenance notes, Purchase cost minor, Storage location. Deze velden nooit publiek doorgeven.
- Integratie: Commerce product ID, Commerce variant ID, Commerce availability, Content revision, Last sync at, Sync error. Lege beschikbaarheid betekent unknown. Deze velden zijn nu normale Airtable-velden; schrijfbeperking is nog niet technisch afgedwongen.

Species en Era notes mogen onbekend blijven. Maak geen claims over diersoort, leeftijd of authenticiteit op basis van alleen een gegenereerde beschrijving of foto. Sale eligibility is een interne menselijke controle, geen automatische juridische conclusie.

## Measurements

Getallen in centimeters met één decimaal. Ontbrekend blijft leeg/null, nooit nul. Velden: borst plat, schouders, ruglengte, mouw, raglanmouw, taille plat en zoom plat. Daarnaast tolerantie, methodenaam, meetmoment, meetpersoon, verificatie en notities. Zie [het meetprotocol](MEASUREMENTS.md).

## Media

Eén bijlage per Original-veld, een rol (`front`, `back`, `detail`, `label`, `flaw`, `measurement`), sorteervolgorde, alt-tekst en goedkeuring. De publisher vult Published URL en Content hash in na overdracht. Foto's mogen gebruikssporen niet verhullen. Geen AI-foto's als bewijs van het werkelijke kledingstuk.

## Publicatievoorwaarden voor de implementatie

Vereist: unieke SKU en slug; titel, categorie en onderbouwde materiaalbeschrijving; beoordeelde staat en conditietekst; verkoopgeschiktheid approved; positieve gehele prijs in EUR; één verified meetset volgens flat-v1; borst- en ruglengte; schouder/mouw of uitleg voor een afwijkende constructie; goedgekeurde voor- en achterfoto, alt-teksten en detailfoto's van genoemde gebreken. Bij een gilet zijn mouwmaten niet van toepassing. Een onbekende materiaalclaim blijft expliciet onbekend en vraagt inhoudelijke beoordeling.

Een verwijderde rij betekent niet automatisch dat een product uit commerce verdwijnt. Uit de verkoop halen gaat via withdrawn en een bevestigde commerce-update. Verwijder echte voorraadrecords niet om een verkoop te annuleren.

Deze regels zijn nu gedocumenteerd. Het schema alleen voert ze niet uit; er is nog geen automatische publisher, invoerinterface of validatie van echte voorraad aanwezig.

## Dagelijkse werkwijze voor Nikki

1. Maak een SKU aan en voer aankoop-, label- en conditiegegevens in als draft.
2. Meet volgens het protocol en koppel de meetset aan het kledingstuk.
3. Voeg foto's toe, één per Media-record, met koppeling, volgorde en alt-tekst.
4. Controleer prijs, beschrijving, maten en herkomst; zet review en daarna ready.
5. Zodra de publisher is gebouwd: controleer de preview, publicatie-uitkomst en eventuele foutmelding.
6. Orders en voorraadmutaties gebeuren in het winkelplatform; een retour wordt eerst geïnspecteerd.

Handige toekomstige views: Invoer, Opnieuw meten, Fotografie, Klaar voor review, Syncfouten en Verkocht. Nu zijn alleen de standaard Grid views aanwezig.
