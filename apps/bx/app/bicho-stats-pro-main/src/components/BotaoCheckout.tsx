import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LINKS_CHECKOUT, type PlanoCheckout } from "@/lib/checkout";
import { cn } from "@/lib/utils";

type Props = {
  children?: React.ReactNode;
  className?: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "secondary";
  plano?: PlanoCheckout;
  mostrarPlanos?: boolean;
};

export function BotaoCheckout({
  children = "Quero acesso agora",
  className,
  size = "lg",
  variant = "default",
  plano = "estatisticas",
  mostrarPlanos = false,
}: Props) {
  function abrir() {
    if (mostrarPlanos) {
      document.querySelector("#planos")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const linkCheckout = LINKS_CHECKOUT[plano];
    if (!linkCheckout) {
      toast.info("Checkout em breve", {
        description: `O pagamento do plano ${plano === "completo" ? "Completo" : "Estatísticas"} será liberado em breve.`,
      });
      return;
    }
    window.location.href = linkCheckout;
  }

  return (
    <Button size={size} variant={variant} onClick={abrir} className={cn("font-semibold", className)}>
      {children}
    </Button>
  );
}
