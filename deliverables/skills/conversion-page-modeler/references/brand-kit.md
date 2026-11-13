# Brand Kit — extração e definição

O brand kit dirige o visual da página (CSS) e o tom da copy. Monte na Etapa 1 a
partir do que o usuário fornecer (site atual, Instagram, logo, ou preferências).

## 1. Paleta (mapear para CSS vars)
- `--brand-primary`   — cor de fundo/identidade dominante (ex.: preto, navy).
- `--brand-secondary` — variação para profundidade/gradiente.
- `--brand-accent`    — cor de AÇÃO: CTAs, destaques, links. Alto contraste.
- `--brand-text`      — texto principal (geralmente branco sobre fundo escuro,
                        ou quase-preto sobre claro).
- `--brand-muted`     — texto de apoio/subtítulos.

Regras: contraste AA mínimo entre texto e fundo. O acento aparece SÓ em ação e
destaque (não espalhe). Se o usuário não tiver paleta, derive da logo ou proponha
2 opções coerentes com o nicho.

## 2. Tipografia
- 1 fonte de display (headlines, peso bold/black) + 1 de texto (legível, regular).
- Se não houver fonte de marca, use uma do Google Fonts coerente (ex.: Inter,
  Outfit, Sora). Defina escala: H1 grande, H2 médio, corpo 16–18px, line-height ~1.5.

## 3. Tom de voz
- 1 frase que resume a voz (ex.: "direto, técnico, sem rodeio").
- Léxico: 5–8 palavras que a marca SEMPRE usa; 5–8 que NUNCA usa.
- Estilo de CTA: preferência (call-to-think provocativo vs. call-to-action direto).

## 4. Saída do brand kit
Entregue um bloco pronto para injetar no `<style>` do template:
```css
:root{
  --brand-primary:#0B0B0F; --brand-secondary:#1A1A24; --brand-accent:#FFB800;
  --brand-text:#FFFFFF; --brand-muted:#B5B5C0;
  --font-display:'Outfit',sans-serif; --font-body:'Inter',sans-serif;
}
```
(valores acima são exemplo — substitua pelos do usuário.)
