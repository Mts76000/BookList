import type { SeriesCatalogVolume } from "@/drizzle/schema";
import { env } from "@/lib/env";

/**
 * Sagas de livres sur Wikidata : la propriété P179 (« fait partie de la série ») relie
 * chaque tome à sa saga, avec son numéro (qualificatif P1545). Gratuit et sans clé.
 *
 * Tout passe par le point d'accès SPARQL, recherche du titre comprise (service
 * `wikibase:mwapi`) : l'API de recherche de wikidata.org limite vite les requêtes d'un même
 * serveur, le point SPARQL non.
 */

const ENDPOINT = "https://query.wikidata.org/sparql";
const TIMEOUT_MS = 10_000;

export interface FetchedSeries {
  id: string;
  name: string;
  volumes: SeriesCatalogVolume[];
}

/** Échappe une chaîne pour un littéral SPARQL entre guillemets. */
function sparqlString(value: string): string {
  return `"${value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\r\n]+/g, " ")}"`;
}

/**
 * Sagas des livres dont le titre ressemble à `title` (recherche Wikidata, en français), et
 * tous les tomes de ces sagas. Seules les œuvres littéraires (Q7725634 et sous-classes)
 * sont gardées : pas les films ni les jeux d'une même franchise.
 */
export function buildSeriesQuery(title: string): string {
  return `SELECT DISTINCT ?series ?seriesNameFr ?seriesNameMul ?seriesNameEn ?book ?bookLabel ?ordinal ?date WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:endpoint "www.wikidata.org"; wikibase:api "EntitySearch";
      mwapi:search ${sparqlString(title.slice(0, 200))}; mwapi:language "fr"; mwapi:limit "5" .
    ?seed wikibase:apiOutputItem mwapi:item .
  }
  ?seed wdt:P179 ?series .
  ?book p:P179 ?statement . ?statement ps:P179 ?series .
  OPTIONAL { ?statement pq:P1545 ?ordinal }
  ?book wdt:P31/wdt:P279* wd:Q7725634 .
  OPTIONAL { ?book wdt:P577 ?date }
  OPTIONAL { ?series rdfs:label ?seriesNameFr FILTER(LANG(?seriesNameFr) = "fr") }
  OPTIONAL { ?series rdfs:label ?seriesNameMul FILTER(LANG(?seriesNameMul) = "mul") }
  OPTIONAL { ?series rdfs:label ?seriesNameEn FILTER(LANG(?seriesNameEn) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,mul,en". }
} LIMIT 400`;
}

type Binding = Record<string, { value: string; "xml:lang"?: string } | undefined>;

const entityId = (uri: string) => uri.slice(uri.lastIndexOf("/") + 1);

type ParsedVolume = SeriesCatalogVolume & { french: boolean };

/**
 * Une saga décrite deux fois sur Wikidata (le Seigneur des anneaux : trois tomes en
 * français, six « livres » en anglais) a des numéros en double. On ne garde alors que les
 * tomes au titre français, ceux des éditions que lisent nos utilisateurs.
 */
function keepOneNumbering(volumes: ParsedVolume[]): ParsedVolume[] {
  const numbered = volumes.filter((volume) => volume.index !== null);
  const hasDuplicates = new Set(numbered.map((volume) => volume.index)).size < numbered.length;
  if (!hasDuplicates || !numbered.some((volume) => volume.french)) return volumes;
  return volumes.filter((volume) => volume.index === null || volume.french);
}

/**
 * Regroupe la réponse SPARQL par saga. Un livre peut revenir plusieurs fois (plusieurs
 * dates de parution) : on garde le numéro entier et l'année la plus ancienne. Un numéro
 * non entier (« 0.5 » pour un prélude) en fait un hors-série.
 */
export function parseSeriesResponse(json: { results: { bindings: Binding[] } }): FetchedSeries[] {
  const series = new Map<string, { name: string; volumes: Map<string, ParsedVolume> }>();

  for (const row of json.results.bindings) {
    if (!row.series || !row.book) continue;
    const seriesId = entityId(row.series.value);
    const bookId = entityId(row.book.value);
    const entry = series.get(seriesId) ?? {
      // « mul » : libellé commun à toutes les langues, que Wikidata utilise de plus en plus
      // pour les noms propres (« Harry Potter ») à la place des libellés fr et en.
      name:
        row.seriesNameFr?.value ?? row.seriesNameMul?.value ?? row.seriesNameEn?.value ?? seriesId,
      volumes: new Map(),
    };
    series.set(seriesId, entry);

    const title = row.bookLabel?.value ?? bookId;
    // Sans libellé, le service renvoie l'identifiant (Q…) : inutilisable comme titre.
    if (/^Q\d+$/.test(title)) continue;
    const ordinal = Number(row.ordinal?.value);
    const index = Number.isInteger(ordinal) && ordinal > 0 ? ordinal : null;
    const year = Number.parseInt(row.date?.value ?? "", 10) || null;

    const previous = entry.volumes.get(bookId);
    entry.volumes.set(bookId, {
      id: bookId,
      title,
      index: previous?.index ?? index,
      year: previous?.year && year ? Math.min(previous.year, year) : (previous?.year ?? year),
      // Un libellé « mul » vaut pour le français aussi.
      french: ["fr", "mul"].includes(row.bookLabel?.["xml:lang"] ?? ""),
    });
  }

  return [...series].map(([id, { name, volumes }]) => ({
    id,
    name,
    volumes: keepOneNumbering([...volumes.values()])
      .map(({ id, title, index, year }) => ({ id, title, index, year }))
      .sort(
        (a, b) => (a.index ?? Infinity) - (b.index ?? Infinity) || (a.year ?? 0) - (b.year ?? 0),
      ),
  }));
}

/** Sagas Wikidata contenant un livre au titre proche de `title`. Lève une erreur réseau. */
export async function fetchSeriesByTitle(title: string): Promise<FetchedSeries[]> {
  const response = await fetch(
    `${ENDPOINT}?${new URLSearchParams({ query: buildSeriesQuery(title) })}`,
    {
      headers: {
        Accept: "application/sparql-results+json",
        // Wikimedia demande un User-Agent identifiable pour tout usage automatisé.
        "User-Agent": `BookList/1.0 (${env.NEXT_PUBLIC_APP_URL})`,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  if (!response.ok) throw new Error(`Wikidata a répondu ${response.status}`);
  return parseSeriesResponse(await response.json());
}
