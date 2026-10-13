/**
 * Fontes reais das legendas (identificadas nos benchmarks):
 *  - Montserrat  → miolo/clean e togi (sans pesada geométrica).
 *  - Playfair Display → hook performático (serifada Didone de alto contraste).
 * Carregadas via @remotion/google-fonts (registra @font-face + espera no render).
 */
import { loadFont as loadMontserrat, fontFamily as montserratFamily } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadPlayfair, fontFamily as playfairFamily } from "@remotion/google-fonts/PlayfairDisplay";

loadMontserrat("normal", { weights: ["600", "700", "800", "900"], subsets: ["latin", "latin-ext"] });
loadPlayfair("normal", { weights: ["700", "800", "900"], subsets: ["latin", "latin-ext"] });

export const FONT_SANS = montserratFamily; // "Montserrat"
export const FONT_SERIF = playfairFamily; // "Playfair Display"
