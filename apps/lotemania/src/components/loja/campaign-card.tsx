import Link from "next/link";

// O cartão da campanha — miniatura, título, subtítulo e badge "Adquira Já!".
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE ESTE ARQUIVO NASCEU EM VEZ DE UMA SEGUNDA CÓPIA DA MARCAÇÃO
//
// A marcação era inline no catálogo (`app/loja/[tenant]/page.tsx`), e o
// bloco 6 da tela de pedido é o MESMO cartão — não um parecido. Copiar
// significaria duas listas de classes com as medidas da Sorteamos (90×110 na
// miniatura, raio 16 no cartão, badge pulsando em #198754) divergindo na
// primeira vez que alguém ajustasse uma delas.
//
// Então o catálogo passou a importar daqui, e a tela de pedido também. É um
// componente de SERVIDOR: nenhum estado, nenhum evento — e por isso o teste
// o renderiza com `renderToStaticMarkup` direto.
//
// ⚠️ O cartão em DESTAQUE do catálogo (a arte grande, proporção 1,23) NÃO
// vem para cá. É outro desenho, com outra medida, e unificar os dois num
// componente com bandeira `variant` esconderia duas telas diferentes atrás
// de um booleano.
// ════════════════════════════════════════════════════════════════════════

export interface CampaignCardProps {
  readonly title: string;
  readonly subtitle: string | null;
  readonly imageUrl: string | null;
  /** Com `href`, o cartão inteiro navega; sem, é só exibição. */
  readonly href?: string;
}

export function CampaignCard({
  title,
  subtitle,
  imageUrl,
  href,
}: CampaignCardProps) {
  const conteudo = (
    <>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={title}
          className="h-[110px] w-[90px] shrink-0 object-cover"
        />
      )}
      <div className="flex min-w-0 flex-col justify-center gap-1 py-2 pr-3">
        <p className="line-clamp-2 text-sm font-semibold text-white">{title}</p>
        {subtitle && (
          <p className="line-clamp-2 text-xs font-normal text-white/90">
            {subtitle}
          </p>
        )}
        <span className="w-fit self-start animate-[pulse_2.5s_ease-in-out_infinite] rounded-[6px] bg-[#198754] px-2 py-[2px] text-[8px] font-semibold text-white">
          Adquira Já!
        </span>
      </div>
    </>
  );

  const classe =
    "flex items-stretch gap-3 overflow-hidden rounded-2xl bg-[#212b36]";

  if (!href) {
    return (
      <div data-campaign-card className={classe}>
        {conteudo}
      </div>
    );
  }

  return (
    <Link
      data-campaign-card
      href={href}
      className={`${classe} hover:bg-[#212b36]/80`}
    >
      {conteudo}
    </Link>
  );
}
