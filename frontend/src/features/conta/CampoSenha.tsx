import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export interface CampoSenhaProps extends Omit<InputProps, "type"> {
  /** Nome acessível do botão de alternar (padrão "Mostrar senha"). */
  rotuloAlternar?: string;
}

/**
 * Campo de senha com botão para mostrar/ocultar (aria-pressed). Recebe id/aria-* do
 * FormField e repassa ao <input>.
 */
export function CampoSenha({ rotuloAlternar = "Mostrar senha", className, ...props }: CampoSenhaProps) {
  const [visivel, setVisivel] = useState(false);
  const Icone = visivel ? EyeOff : Eye;
  return (
    <div className="relative">
      <Input {...props} type={visivel ? "text" : "password"} className={cn("pr-12", className)} />
      <button
        type="button"
        aria-label={rotuloAlternar}
        aria-pressed={visivel}
        aria-controls={props.id}
        onClick={() => setVisivel((v) => !v)}
        className="absolute right-0 top-0 flex size-11 items-center justify-center text-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icone aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
