import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { formatarData, formatarDataCurta, formatarKg, formatarNumero } from "@/lib/format";
import type { AvaliacaoPublica } from "@/types/api";

const LARGURA_PADRAO = 600;
const ALTURA = 220;
const MARGEM = { topo: 16, direita: 24, base: 32, esquerda: 52 };
/** Espaço mínimo por rótulo de data no eixo X; abaixo disso só mostra o primeiro e o último. */
const ESPACO_ROTULO_X = 64;

/** Largura do contêiner (ResizeObserver); usa o padrão onde não existe (jsdom). */
function useLargura(ref: RefObject<HTMLElement | null>): number {
  const [largura, setLargura] = useState(LARGURA_PADRAO);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(([entrada]) => {
      const nova = Math.round(entrada.contentRect.width);
      if (nova > 0) setLargura(nova);
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, [ref]);
  return largura;
}

function escalaY(valores: number[]): { min: number; max: number } {
  const menor = Math.min(...valores);
  const maior = Math.max(...valores);
  const folga = maior === menor ? Math.max(5, maior * 0.05) : (maior - menor) * 0.15;
  return { min: Math.max(0, Math.floor(menor - folga)), max: Math.ceil(maior + folga) };
}

interface GraficoEvolucaoProps {
  /** Avaliações em ordem cronológica crescente. */
  avaliacoes: AvaliacaoPublica[];
  nomeExercicio: string;
}

/** Linha do 1RM estimado ao longo das avaliações (SVG próprio, sem biblioteca). */
export function GraficoEvolucao({ avaliacoes, nomeExercicio }: GraficoEvolucaoProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const largura = useLargura(contenedorRef);
  const tituloId = useId();
  const descricaoId = useId();

  const valores = avaliacoes.map((a) => a.rm1_estimado_kg);
  const { min, max } = escalaY(valores);
  const areaL = Math.max(1, largura - MARGEM.esquerda - MARGEM.direita);
  const areaA = ALTURA - MARGEM.topo - MARGEM.base;
  const passo = avaliacoes.length > 1 ? areaL / (avaliacoes.length - 1) : 0;

  const x = (i: number) => MARGEM.esquerda + (avaliacoes.length > 1 ? i * passo : areaL / 2);
  const y = (v: number) => MARGEM.topo + areaA - ((v - min) / (max - min)) * areaA;

  const pontos = avaliacoes.map((a, i) => ({ a, px: x(i), py: y(a.rm1_estimado_kg) }));
  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(" ");
  const ticksY = [min, (min + max) / 2, max];
  const todosRotulosX = passo >= ESPACO_ROTULO_X;

  const primeira = avaliacoes[0];
  const ultima = avaliacoes[avaliacoes.length - 1];
  const descricao =
    `Gráfico de linha com ${avaliacoes.length} ${avaliacoes.length === 1 ? "avaliação" : "avaliações"}` +
    (primeira && ultima
      ? `, de ${formatarData(primeira.criado_em)} a ${formatarData(ultima.criado_em)}. ` +
        `O 1RM estimado foi de ${formatarKg(primeira.rm1_estimado_kg)} para ${formatarKg(ultima.rm1_estimado_kg)}; ` +
        `mínimo ${formatarKg(Math.min(...valores))} e máximo ${formatarKg(Math.max(...valores))}.`
      : ".") +
    " Os mesmos dados estão na lista de avaliações.";

  return (
    <div ref={contenedorRef} className="w-full">
      <svg
        role="img"
        aria-labelledby={`${tituloId} ${descricaoId}`}
        width={largura}
        height={ALTURA}
        viewBox={`0 0 ${largura} ${ALTURA}`}
        className="block max-w-full overflow-visible"
      >
        <title id={tituloId}>{`Evolução do 1RM estimado — ${nomeExercicio}`}</title>
        <desc id={descricaoId}>{descricao}</desc>

        {ticksY.map((v) => (
          <g key={v}>
            <line
              x1={MARGEM.esquerda}
              x2={largura - MARGEM.direita}
              y1={y(v)}
              y2={y(v)}
              className="stroke-border"
              strokeDasharray="4 4"
            />
            <text
              x={MARGEM.esquerda - 8}
              y={y(v)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground font-mono text-[11px]"
            >
              {formatarNumero(Math.round(v))}
            </text>
          </g>
        ))}
        <text x={4} y={MARGEM.topo - 4} className="fill-muted-foreground font-mono text-[10px]">
          kg
        </text>

        {pontos.map((p, i) => {
          const ehPonta = i === 0 || i === pontos.length - 1;
          if (!todosRotulosX && !ehPonta) return null;
          const ancora =
            pontos.length === 1 ? "middle" : i === 0 ? "start" : i === pontos.length - 1 ? "end" : "middle";
          return (
            <text
              key={p.a.id}
              x={p.px}
              y={ALTURA - 8}
              textAnchor={ancora}
              className="fill-muted-foreground font-mono text-[11px]"
            >
              {formatarDataCurta(p.a.criado_em)}
            </text>
          );
        })}

        <path d={linha} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinejoin="round" />
        {pontos.map((p) => (
          <circle key={p.a.id} cx={p.px} cy={p.py} r={4.5} className="fill-accent stroke-background" strokeWidth={2}>
            <title>{`${formatarData(p.a.criado_em)}: ${formatarKg(p.a.rm1_estimado_kg)}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
