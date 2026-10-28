const PERMANENT = [
  'Incisivo central',
  'Incisivo lateral',
  'Canino',
  '1º pré-molar',
  '2º pré-molar',
  '1º molar',
  '2º molar',
  'Siso (3º molar)',
];
const DECIDUOUS = ['Incisivo central', 'Incisivo lateral', 'Canino', '1º molar', '2º molar'];

/** Nome popular do dente a partir do código FDI (ex.: 26 → "1º molar superior esquerdo"). */
export function toothName(toothCode: string): string | null {
  const quadrant = Number(toothCode[0]);
  const position = Number(toothCode[1]);
  if (!Number.isInteger(quadrant) || !Number.isInteger(position)) return null;
  const names = quadrant >= 5 ? DECIDUOUS : PERMANENT;
  const name = names[position - 1];
  if (!name) return null;
  const upper = [1, 2, 5, 6].includes(quadrant);
  const right = [1, 4, 5, 8].includes(quadrant);
  return `${name} ${upper ? 'superior' : 'inferior'} ${right ? 'direito' : 'esquerdo'}`;
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

/** Códigos FDI agrupados por arcada, para o seletor de dente. */
export const TOOTH_CODE_GROUPS = [
  { label: 'Superior direito', codes: range(11, 18).reverse() },
  { label: 'Superior esquerdo', codes: range(21, 28) },
  { label: 'Inferior esquerdo', codes: range(31, 38) },
  { label: 'Inferior direito', codes: range(41, 48).reverse() },
  { label: 'Dentes de leite', codes: [...range(51, 55), ...range(61, 65), ...range(71, 75), ...range(81, 85)] },
];
