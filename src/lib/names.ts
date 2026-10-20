/** Visual split of a trailing " #ID". The characters themselves are unchanged. */
export function splitName(name: string): { base: string; id?: string } {
  const match = /^(.*)\s(#\w+)$/.exec(name);
  if (!match) return { base: name };
  return { base: match[1], id: match[2] };
}

export function shortName(name: string): string {
  return splitName(name).base;
}

/** Route params may still contain %20 or %23. Decode once; leave the string if it is not encoded. */
export function decodeRouteName(value: string): string {
  if (!value.includes("%")) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const LOOKALIKE: Record<string, string> = {
  I: "i",
  l: "i",
  "1": "i",
  "|": "i",
  І: "i",
  і: "i",
  А: "a",
  а: "a",
  В: "b",
  Е: "e",
  е: "e",
  К: "k",
  М: "m",
  Н: "h",
  О: "o",
  о: "o",
  Р: "p",
  р: "p",
  С: "c",
  с: "c",
  Т: "t",
  У: "y",
  у: "y",
  Х: "x",
  х: "x",
  Ѕ: "s",
  ѕ: "s",
};

/**
 * Folding used only for search matching. Never use the result as a label
 * or as a stats group key — `Wazabz` and `Wazabz่` must stay distinct on screen.
 */
export function searchKey(name: string): string {
  const stripped = name.normalize("NFD").replace(/\p{M}/gu, "");
  let out = "";
  for (const ch of stripped) {
    const code = ch.codePointAt(0) ?? 0;
    if ((code >= 0x0e31 && code <= 0x0e3a) || (code >= 0x0e47 && code <= 0x0e4e)) continue;
    out += LOOKALIKE[ch] ?? ch.toLowerCase();
  }
  return out;
}
