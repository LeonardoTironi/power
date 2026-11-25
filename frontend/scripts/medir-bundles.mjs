// RNF02 — tamanho dos bundles por rota (bruto e gzip), a partir do manifest do Vite.
// Uso: npm run medir:bundles   (faz `vite build --manifest` e roda este script)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(raiz, "dist");
const manifest = JSON.parse(readFileSync(join(dist, ".vite", "manifest.json"), "utf8"));

const tamanho = (arquivo) => {
  const conteudo = readFileSync(join(dist, arquivo));
  return { bruto: conteudo.length, gzip: gzipSync(conteudo, { level: 9 }).length };
};

/** Arquivos JS e CSS de uma entrada e de todos os imports estáticos (transitivos). */
function arquivosDe(chave, vistos = new Set()) {
  if (vistos.has(chave)) return vistos;
  vistos.add(chave);
  for (const importado of manifest[chave].imports ?? []) arquivosDe(importado, vistos);
  return vistos;
}

function somar(chaves) {
  const arquivos = new Set();
  for (const chave of chaves) {
    const item = manifest[chave];
    arquivos.add(item.file);
    for (const css of item.css ?? []) arquivos.add(css);
  }
  let bruto = 0;
  let gzip = 0;
  for (const arquivo of arquivos) {
    const t = tamanho(arquivo);
    bruto += t.bruto;
    gzip += t.gzip;
  }
  return { bruto, gzip, arquivos: [...arquivos] };
}

const entrada = Object.keys(manifest).find((k) => manifest[k].isEntry);
const base = arquivosDe(entrada);
const html = tamanho("index.html");
const inicial = somar(base);

const ROTAS = {
  "/": "src/pages/HomePage.tsx",
  "/avaliar": "src/pages/AvaliacaoPage.tsx",
  "/login": "src/pages/LoginPage.tsx",
  "/cadastro": "src/pages/CadastroPage.tsx",
  "/termos": "src/pages/TermosPage.tsx",
  "/conta": "src/pages/ContaPage.tsx",
  "/historico": "src/pages/HistoricoPage.tsx",
  "/historico/:id": "src/pages/AvaliacaoDetalhePage.tsx",
};

const kb = (n) => (n / 1024).toFixed(1).replace(".", ",");
const linhas = [];
const json = { data: new Date().toISOString(), html, inicial, rotas: {} };

for (const [rota, modulo] of Object.entries(ROTAS)) {
  if (!manifest[modulo]) {
    linhas.push(`| ${rota} | (módulo ${modulo} não encontrado) | | |`);
    continue;
  }
  // Só o que a rota acrescenta ao pacote inicial (imports lazy próprios).
  const proprios = [...arquivosDe(modulo)].filter((k) => !base.has(k));
  const extra = somar(proprios);
  const total = { bruto: html.bruto + inicial.bruto + extra.bruto, gzip: html.gzip + inicial.gzip + extra.gzip };
  json.rotas[rota] = { extra, total };
  linhas.push(`| ${rota} | ${kb(extra.gzip)} | ${kb(total.gzip)} | ${kb(total.bruto)} |`);
}

console.log(`HTML: ${kb(html.gzip)} KiB gzip | pacote inicial (entrada + imports estáticos): ${kb(inicial.gzip)} KiB gzip (${kb(inicial.bruto)} KiB bruto)`);
console.log("\n| Rota | Chunk(s) da rota, gzip (KiB) | Total na 1ª visita, gzip (KiB) | Total bruto (KiB) |");
console.log("|---|---|---|---|");
for (const l of linhas) console.log(l);

mkdirSync(join(raiz, "test-results"), { recursive: true });
writeFileSync(join(raiz, "test-results", "bundles.json"), JSON.stringify(json, null, 2));
