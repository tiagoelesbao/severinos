import { Inbox } from "lucide-react";

export function EmptyState({ label = "Sem Registros" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="flex size-20 items-center justify-center rounded-full bg-muted">
        <Inbox className="size-9 text-muted-foreground" />
      </div>
      <p className="font-semibold">{label}</p>
    </div>
  );
}
