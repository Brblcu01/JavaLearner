import { AreaId, Topic } from './models';

export const PASS_MARK = 68;
export const EXAM_QUESTIONS = 50;
export const EXAM_MINUTES = 90;

export const AREAS: { id: AreaId; name: string }[] = [
  { id: 'fondamenti', name: 'Fondamenti del linguaggio' },
  { id: 'oop', name: 'Programmazione a oggetti' },
  { id: 'funzionale', name: 'Lambda e stream' },
  { id: 'api', name: 'API della piattaforma' },
  { id: 'piattaforma', name: 'Moduli, concorrenza, sicurezza' },
];

export const TOPICS: Topic[] = [
  { id: 'basics', name: 'Basi di Java', short: 'Basi', area: 'fondamenti', chapter: 'JSE17 · 1', inExam829: true },
  { id: 'data-types', name: 'Tipi, stringhe e operatori', short: 'Tipi', area: 'fondamenti', chapter: 'JSE17 · 2', inExam829: true },
  { id: 'decisions', name: 'Costrutti decisionali', short: 'If/switch', area: 'fondamenti', chapter: 'JSE17 · 3', inExam829: true },
  { id: 'arrays', name: 'Array e ArrayList', short: 'Array', area: 'fondamenti', chapter: 'JSE17 · 4', inExam829: true },
  { id: 'loops', name: 'Cicli, break e continue', short: 'Cicli', area: 'fondamenti', chapter: 'JSE17 · 5', inExam829: true },
  { id: 'java17', name: 'Novità Java 17', short: 'Java 17', area: 'fondamenti', chapter: 'JSE17 · 21', inExam829: true },
  { id: 'classes', name: 'Classi, metodi, costruttori', short: 'Classi', area: 'oop', chapter: 'JSE17 · 6', inExam829: true },
  { id: 'enums', name: 'Enum', short: 'Enum', area: 'oop', chapter: 'JSE17 · 7', inExam829: true },
  { id: 'inheritance', name: 'Ereditarietà e polimorfismo', short: 'Ereditarietà', area: 'oop', chapter: 'JSE17 · 8', inExam829: true },
  { id: 'exceptions', name: 'Eccezioni', short: 'Eccezioni', area: 'oop', chapter: 'JSE17 · 9', inExam829: true },
  { id: 'annotations', name: 'Annotazioni', short: 'Annotazioni', area: 'oop', chapter: 'JSE11 · 13', inExam829: true },
  { id: 'lambda', name: 'Lambda e interfacce funzionali', short: 'Lambda', area: 'funzionale', chapter: 'JSE17 · 10', inExam829: true },
  { id: 'streams', name: 'Stream API', short: 'Stream', area: 'funzionale', chapter: 'JSE17 · 11', inExam829: true },
  { id: 'collections', name: 'Generics e Collections', short: 'Collections', area: 'api', chapter: 'JSE17 · 14', inExam829: true },
  { id: 'datetime', name: 'Date Time API', short: 'Date/Time', area: 'api', chapter: 'JSE17 · 22', inExam829: true },
  { id: 'io', name: 'I/O e serializzazione', short: 'I/O', area: 'api', chapter: 'JSE17 · 15', inExam829: true },
  { id: 'nio', name: 'File NIO.2', short: 'NIO', area: 'api', chapter: 'JSE17 · 16', inExam829: true },
  { id: 'localization', name: 'Localizzazione', short: 'Locale', area: 'api', chapter: 'JSE17 · 17', inExam829: true },
  { id: 'jdbc', name: 'JDBC', short: 'JDBC', area: 'api', chapter: 'JSE17 · 13', inExam829: true },
  { id: 'modules', name: 'Java Module System', short: 'Moduli', area: 'piattaforma', chapter: 'JSE17 · 12', inExam829: true },
  { id: 'concurrency', name: 'Concorrenza e thread', short: 'Thread', area: 'piattaforma', chapter: 'JSE17 · 18, 20', inExam829: true },
  { id: 'security', name: 'Sicurezza (Java 11)', short: 'Sicurezza', area: 'piattaforma', chapter: 'JSE11 · 19', inExam829: false },
];

const byId = new Map(TOPICS.map((t) => [t.id, t]));
export const topicById = (id: string): Topic | undefined => byId.get(id);
