export const ANIMAIS = [
  "Avestruz",
  "Águia",
  "Burro",
  "Borboleta",
  "Cachorro",
  "Cabra",
  "Carneiro",
  "Camelo",
  "Cobra",
  "Coelho",
  "Cavalo",
  "Elefante",
  "Galo",
  "Gato",
  "Jacaré",
  "Leão",
  "Macaco",
  "Porco",
  "Pavão",
  "Peru",
  "Touro",
  "Tigre",
  "Urso",
  "Veado",
  "Vaca",
] as const;

export const EMOJIS: Record<number, string> = {
  1: "🦤",
  2: "🦅",
  3: "🫏",
  4: "🦋",
  5: "🐕",
  6: "🐐",
  7: "🐑",
  8: "🐪",
  9: "🐍",
  10: "🐇",
  11: "🐎",
  12: "🐘",
  13: "🐓",
  14: "🐈",
  15: "🐊",
  16: "🦁",
  17: "🐒",
  18: "🐖",
  19: "🦚",
  20: "🦃",
  21: "🐂",
  22: "🐅",
  23: "🐻",
  24: "🦌",
  25: "🐄",
};

export function nomeGrupo(grupo: number): string {
  return ANIMAIS[grupo - 1] ?? "—";
}

export function dezenaDoNumero(numero: string): string {
  return numero.padStart(4, "0").slice(-2);
}

export function grupoDoNumero(numero: string): number {
  const dezena = Number(dezenaDoNumero(numero));
  return dezena === 0 ? 25 : Math.ceil(dezena / 4);
}

export function dezenasDoGrupo(grupo: number): string[] {
  if (grupo === 25) return ["97", "98", "99", "00"];
  const fim = grupo * 4;
  return [fim - 3, fim - 2, fim - 1, fim].map((n) => String(n).padStart(2, "0"));
}

export type Sorteio = {
  id: string;
  banca: string;
  extracao: string;
  data_sorteio: string;
  premio: number;
  numero: string;
  dezena: string;
  grupo: number;
};

export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}
