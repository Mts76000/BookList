/**
 * Teintes des couvertures générées quand un livre n'a pas d'image, prises dans la palette
 * (terracotta, mousse, brun). Sombres, pour que le titre en crème reste lisible. Partagées
 * entre l'application (`<BookCover />`) et les images à partager, pour qu'un même livre y
 * ait la même couverture.
 */
const GENERATED_TONES = ["#79331a", "#4f6a41", "#504536", "#93401e", "#33452c", "#5f2a18"];

/** Même titre, même teinte : la couverture ne change pas d'une page à l'autre. */
export function coverToneFor(title: string): string {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return GENERATED_TONES[Math.abs(hash) % GENERATED_TONES.length];
}
