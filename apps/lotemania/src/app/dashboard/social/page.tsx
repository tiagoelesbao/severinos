// Rota placeholder. page.tsx e social-form.tsx tem 0 bytes desde 2026-10-24 e
// nao estavam no bundle publico. A action updateSocialMedias() em
// src/lib/actions/site-config.ts grava settings.socialMedias como um
// Record<string, string> sem conjunto de chaves declarado — nao da para saber
// quais redes a tela editava sem inventa-las. Titulo conforme
// src/lib/nav-config.ts.
import { EmptyState } from "@/components/ui/empty-state";

export default function SocialPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Redes Sociais</h1>
      </div>

      <div className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-400">
        Esta tela ainda não foi construída. A gravação já existe
        (<code className="px-1">updateSocialMedias</code>), mas o formulário foi
        perdido e o conjunto de redes que ele editava não está declarado em
        nenhum lugar.
      </div>

      <div className="rounded-lg border bg-card">
        <EmptyState label="Tela não construída" />
      </div>
    </div>
  );
}
