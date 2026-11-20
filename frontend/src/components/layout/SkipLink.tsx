/** Link "Pular para o conteúdo": visível só ao receber foco. */
export function SkipLink({ alvo = "conteudo" }: { alvo?: string }) {
  return (
    <a
      href={`#${alvo}`}
      className="sr-only z-[60] bg-primary px-4 py-2 font-mono text-sm uppercase tracking-wider text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      Pular para o conteúdo
    </a>
  );
}
