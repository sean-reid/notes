const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
export const ID_LENGTH = 10;

export function newId(
  random: (bytes: Uint8Array<ArrayBuffer>) => void = (b) => crypto.getRandomValues(b),
): string {
  const bytes = new Uint8Array(ID_LENGTH);
  random(bytes);
  let id = "";
  for (const b of bytes) id += ALPHABET[b & 31];
  return id;
}

export const isId = (value: string): boolean =>
  value.length === ID_LENGTH && [...value].every((c) => ALPHABET.includes(c));
