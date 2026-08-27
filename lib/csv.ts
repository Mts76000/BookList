// Parseur CSV minimal (sans dépendance) supportant les champs entre guillemets
// avec virgules et guillemets échappés ("").

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushField();
    } else if (char === "\n") {
      pushRow();
    } else if (char === "\r") {
      // ignore, handled by \n
    } else {
      field += char;
    }
  }

  // Dernière ligne si le fichier ne se termine pas par un saut de ligne
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function csvRowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const [header, ...dataRows] = rows;
  const keys = header.map((h) => h.trim());

  return dataRows.map((row) => {
    const obj: Record<string, string> = {};
    keys.forEach((key, index) => {
      obj[key] = (row[index] ?? "").trim();
    });
    return obj;
  });
}
