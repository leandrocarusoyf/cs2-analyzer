/**
 * Utilitário de cálculo de contraste e luminância para cores de times em CS2.
 * Garante que logos escuros (ex: logos monocromáticos pretos/grafite) não causem
 * problemas de acessibilidade visual e baixo contraste na exibição do placar.
 */

export function getContrastingTeamColor(hex: string): string {
  if (!hex) return '#F8FAFC';

  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length !== 3 && cleanHex.length !== 6) {
    return '#F8FAFC';
  }

  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((char) => char + char)
          .join('')
      : cleanHex;

  const r = parseInt(fullHex.substring(0, 2), 16) || 0;
  const g = parseInt(fullHex.substring(2, 4), 16) || 0;
  const b = parseInt(fullHex.substring(4, 6), 16) || 0;

  // Fórmula de luminância relativa WCAG / ITU-R BT.709
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Se a cor for muito escura (luminância < 25%), força branco tático de alto contraste
  if (luminance < 0.25) {
    return '#F8FAFC';
  }

  return hex.startsWith('#') ? hex : `#${hex}`;
}
