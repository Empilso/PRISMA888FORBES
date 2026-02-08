
// Paleta PRISMA (cores do arco-íris)
const RAINBOW_COLORS = [
    '#FF0000', // Vermelho
    '#FF7F00', // Laranja
    '#FFFF00', // Amarelo
    '#00FF00', // Verde
    '#0000FF', // Azul
    '#4B0082', // Índigo
    '#9400D3', // Violeta
]

/**
 * Aplica efeito rainbow por palavra (mais legível)
 */
export function rainbowWords(text: string): string {
    if (!text) return '';
    const words = text.split(' ');
    return words
        .map((word, index) => {
            const colorIndex = index % RAINBOW_COLORS.length;
            const color = RAINBOW_COLORS[colorIndex];
            return `<span style="color: ${color}">${word}</span>`;
        })
        .join(' ');
}

/**
 * Aplica efeito rainbow por caractere (mais intenso)
 */
export function rainbowText(text: string): string {
    if (!text) return '';
    return text
        .split('')
        .map((char, index) => {
            const colorIndex = index % RAINBOW_COLORS.length;
            const color = RAINBOW_COLORS[colorIndex];
            return `<span style="color: ${color}">${char}</span>`;
        })
        .join('');
}
