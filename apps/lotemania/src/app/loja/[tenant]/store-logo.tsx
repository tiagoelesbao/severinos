"use client";

import { useState } from "react";
import { Crown } from "lucide-react";

/**
 * Logo do cabeçalho da loja, com três níveis de queda:
 *
 *   1. `logoUrl` das settings do tenant, se alguém preencheu;
 *   2. a convenção `public/tenants/{slug}/logo.png`, para o arquivo poder ser
 *      versionado junto do código sem precisar passar pelo banco;
 *   3. o par coroa + nome, que era o que existia antes.
 *
 * O `onError` é o que torna o nível 2 seguro num produto white-label: um
 * tenant sem arquivo não fica com imagem quebrada, cai no nível 3 sozinho.
 *
 * A logo da Sorteamos tem 128×40 e **já contém o nome** — por isso ela
 * substitui o par ícone+texto em vez de acompanhá-lo.
 */
export function StoreLogo({
  tenantSlug,
  siteName,
  logoUrl,
}: {
  tenantSlug: string;
  siteName: string;
  logoUrl: string | null;
}) {
  const [falhou, setFalhou] = useState(false);
  const src = logoUrl || `/tenants/${tenantSlug}/logo.png`;

  if (falhou) {
    return (
      <>
        <Crown className="size-6 fill-amber-400 text-amber-400" />
        <span className="text-lg font-bold uppercase tracking-wide text-white">
          {siteName}
        </span>
      </>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={siteName}
      onError={() => setFalhou(true)}
      className="h-10 w-auto max-w-[128px] object-contain object-left"
    />
  );
}
