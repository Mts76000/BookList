/**
 * Partage une image générée par l'application : partage natif quand le navigateur sait
 * partager des fichiers (mobile surtout), téléchargement sinon. Côté navigateur uniquement.
 *
 * Renvoie `false` si l'image n'a pas pu être récupérée, pour que l'appelant l'annonce.
 */
export async function shareOrDownloadImage(
  url: string,
  fileName: string,
  title: string,
  mode: "share" | "download" = "share",
): Promise<boolean> {
  let file: File;
  try {
    const response = await fetch(url);
    if (!response.ok) return false;
    file = new File([await response.blob()], fileName, { type: "image/png" });
  } catch {
    return false;
  }

  if (mode === "share" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
    } catch {
      // Partage annulé par l'utilisateur : rien à signaler.
    }
    return true;
  }

  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(objectUrl);
  return true;
}
