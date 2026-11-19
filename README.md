# JavaLearner

App Angular per preparare la certificazione **Oracle Java SE 17 Developer (1Z0-829)**, costruita sui manuali del corso
(JSE17 + annotazioni e sicurezza dal corso JSE11).

## Avvio

```bash
npm install
npm start          # http://localhost:4200
npm run build      # build di produzione in dist/java-learner
```

## Cosa c'è

- **Panoramica**: precisione per argomento contro la soglia d'esame del 68%, errori aperti, ultime sessioni.
- **Argomenti**: 22 argomenti raggruppati per area, con note d'esame dal manuale e stato di ogni domanda.
- **Esercitati**: scegli argomenti, filtro (tutte / mai viste / sbagliate) e quantità; correzione e spiegazione subito.
- **Simulazione**: 50 domande in proporzione, 90 minuti, segna per revisione. Correzione e spiegazione dopo ogni risposta (attiva di default) oppure solo alla consegna, come all'esame vero.
- **Storico**: andamento delle simulazioni, attività giornaliera, tutte le sessioni, tema, backup e reset.

Scorciatoie nel quiz: `A`–`F` o `1`–`6` per scegliere, `Invio` per verificare / andare avanti, `←` `→` per spostarsi.

## Dati

- Domande: `public/questions/<argomento>.json` (domande in inglese come all'esame, spiegazioni in italiano).
  Ogni snippet di codice è stato compilato ed eseguito con `javac --release 17`.
- Elenco argomenti e parametri d'esame: `src/app/core/topics.ts`.
- I progressi stanno nel `localStorage` del browser; da **Storico → Backup** si esportano/importano in JSON.

Formato di una domanda:

```json
{
  "id": "streams-001",
  "difficulty": 2,
  "prompt": "What is the output? (Choose two.)",
  "code": "List.of(1, 2).stream()...",
  "options": ["...", "..."],
  "correct": [0, 2],
  "explanation": "Spiegazione in italiano, `codice` tra backtick.",
  "source": "JSE17 DEV - 11 Stream"
}
```
