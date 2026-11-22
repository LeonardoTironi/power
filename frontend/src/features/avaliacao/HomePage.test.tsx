import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { HomePage } from "@/pages/HomePage";
import { server } from "@/test/server";
import { api } from "@/test/handlers/url";
import { criarJwtFake } from "@/test/jwt";
import { renderWithProviders } from "@/test/render";

describe("HomePage", () => {
  it("explica o app e leva para /avaliar e /cadastro quando deslogado", async () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Scouter Power" })).toBeInTheDocument();
    expect(screen.getByText(/descubra seu 1RM estimado/)).toBeInTheDocument();
    expect(screen.getByText(/Supino, agachamento ou levantamento terra/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fazer avaliação" })).toHaveAttribute("href", "/avaliar");
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/cadastro");
    expect(await screen.findByText("Serviço online")).toBeInTheDocument();
  });

  it("logado: não mostra o convite de cadastro", () => {
    server.use(
      http.get(api("/usuarios/me"), () =>
        HttpResponse.json({ id: "1", nome: "Ana", email: "ana@exemplo.com", criado_em: "2026-11-01T10:00:00Z" }),
      ),
    );
    renderWithProviders(<HomePage />, { token: criarJwtFake() });
    expect(screen.getByRole("link", { name: "Fazer avaliação" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Criar conta" })).not.toBeInTheDocument();
  });

  it("mostra o serviço indisponível de forma discreta se /health falhar", async () => {
    server.use(http.get(api("/health"), () => HttpResponse.json({ detail: "x" }, { status: 503 })));
    renderWithProviders(<HomePage />);
    expect(await screen.findByText("Serviço indisponível no momento")).toBeInTheDocument();
  });
});
