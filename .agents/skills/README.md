# Ontwerpskills voor Nikki’s Boetiek

Deze projectlokale skills zijn op 7 november 2026 opgenomen op verzoek van Martijn. Codex kan ze via `.agents/skills` ontdekken; andere agents lezen de expliciete verwijzingen in [AGENTS.md](../../AGENTS.md). Geen globale installatie of extra frontendpakket nodig.

| Skill | Rol | Bron |
|---|---|---|
| [Frontend Design](frontend-design/SKILL.md) | Visuele richting, eenvoud, compositie en zelfkritiek | [Anthropic](https://github.com/anthropics/skills/tree/main/skills/frontend-design) |
| [UI UX Pro Max](ui-ux-pro-max/SKILL.md) | Aanvullende lokale UX-gegevens en mobiele richtlijnen | [Next Level Builder](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) |
| [Web Design Guidelines](web-design-guidelines/SKILL.md) | Review van de gebouwde interface | [Vercel](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) |

De exacte upstreamcommits en SHA-256-bestandshashes staan in [sources.json](sources.json). De beschikbare licentiebestanden van Frontend Design en UI UX Pro Max zijn meegeleverd. In de opgehaalde Vercel-skill en repositoryroot is geen apart licentiebestand aangetroffen; er wordt geen licentie bij verzonnen.

UI UX Pro Max bevat de bijbehorende data, scripts en referenties. De Claude-pluginpaden in de skill zijn aangepast naar dit project; upstreamtests en Python-caches zijn niet overgenomen. Gebruik vanuit de repositoryroot bijvoorbeeld:

```sh
python .agents/skills/ui-ux-pro-max/scripts/search.py "mobile navigation" --domain ux
```

Vanuit een andere map: gebruik het absolute pad naar dat script. Python 3 is nodig; er zijn voor de lokale zoekfunctie geen extra packages nodig. Zoekresultaten zijn aanbevelingen: controleer relevantie vóór toepassing. Geen nieuwe Tailwind-, React- of animatieafhankelijkheid toevoegen alleen omdat een voorbeeld die gebruikt. De huidige app gebruikt gewone JavaScript en CSS.

Web Design Guidelines verwijst naar actuele regels op GitHub. Haal die bij een daadwerkelijke review op zoals de skill voorschrijft. Als dat niet lukt, meld welke controle ontbreekt; claim geen uitgevoerde review.

Updates gebeuren bewust via een eigen branch: controleer verschillen en licenties, behoud lokale aanpassingen en actualiseer bronnen en hashes. De versie in Git is leidend voor het begin van een sessie; download niet stilzwijgend nieuwe skillversies.
