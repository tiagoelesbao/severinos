# Template — Prompts de Imagem (F4)

```yaml
template:
  id: image-prompts-tmpl
  version: 1.0.0
  owner: farming-modeler
  output: prompts-imagem.md
  consumed_by: farming-imager
```

---

# Prompts de Imagem · {{handle}} · rank {{rank}}

**Criativo modelado:** {{url}}
**Nicho:** {{nicho}} · **Takes:** {{take_count}} · **Formato:** 9:16 (1080×1920)
**Seed travada:** `{{seed}}` — a mesma em todos os takes, para que pareçam o mesmo mundo.

---

## 🧹 Camadas descartadas antes da tradução

> Um screenshot do TikTok não é a imagem: é a imagem **mais** sobreposições. Traduzir
> tudo junto faz o prompt pedir legenda, watermark e botão de curtir dentro da arte.
> Esta seção declara o que foi ignorado — ela existe para você **auditar** a tradução.

| Camada encontrada | Onde | Descartada? |
|:---|:---|:---:|
| Legenda queimada / texto na tela | {{onde}} | ✅ |
| Texto e @handle do autor | rodapé | ✅ |
| Contadores (likes, comentários, compartilhar) | coluna direita | ✅ |
| Avatar e botão de seguir | coluna direita | ✅ |
| Marca d'água do TikTok | {{posição}} | ✅ |
| Ícone/disco de música | canto inferior | ✅ |
| {{outro}} | {{onde}} | ✅ |

**Oclusões registradas:** {{oclusoes}}
> Quando uma sobreposição cobre parte da cena, o que está atrás **não é inventado**.
> A área ocluída é declarada aqui e o prompt descreve apenas o que estava visível.

---

## Take {{n}} — {{função}}

### Tradução da cena ("para até cego ver")

> Descrição literal da **camada de cena apenas**, sem nenhuma sobreposição.

| Dimensão | Descrição |
|:---|:---|
| Enquadramento | {{plano, ângulo, posição do sujeito no quadro}} |
| Sujeito | {{o que ocupa o primeiro plano}} |
| Fundo | {{o que está atrás, e quão desfocado}} |
| Luz | {{direção, temperatura, dureza, contraluz}} |
| Cor | {{paleta dominante, saturação, contraste}} |
| Textura | {{grão, halação, nitidez, atmosfera}} |
| Lente | {{distância focal aparente, profundidade de campo}} |
| Movimento congelado | {{o que sugere ação, se houver}} |

### Prompt final

```text
{{prompt em prosa corrida, 9:16 vertical, incorporando as dimensões acima
+ sufixo de estilo do nicho}}
```

**Negativos:**
```text
texto, letras, tipografia, legenda, marca d'água, logotipo, interface,
botões, rosto de pessoa real, anatomia distorcida, moldura, borda
{{negativos adicionais do nicho}}
```

**Referência visual:** `screenshots/{{frame}}` — enviar junto ao prompt em providers com
`supports_reference_image: true`. Nesses casos a referência vale mais que o texto.

---

## Regras que este documento obedece

1. **Nenhum prompt pede texto na imagem.** Todo texto entra na F6, no video-studio, onde é
   vetorial, corrigível e animável. Modelo de imagem erra tipografia.
2. **Nenhum prompt pede rosto de pessoa real** ou identificável.
3. **Seed travada** entre os takes do mesmo criativo — sem isso o criativo montado parece
   uma colagem de três vídeos diferentes.
4. **Sufixo de estilo do nicho** (`modeling.visual_style`) aplicado em todos os takes.
5. **`avoid_in_prompt` do nicho** respeitado antes de qualquer chamada de API.
