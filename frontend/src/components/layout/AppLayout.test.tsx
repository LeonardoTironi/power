import { describe, expect, it } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import { routes } from "@/app/routes";
import { renderWithProviders } from "@/test/render";

function anuncio(): HTMLElement {
  return screen.getByTestId("anuncio-rota");
}

describe("AppLayout: foco e anúncio ao trocar de página", () => {
  it("na primeira carga não move o foco nem anuncia", async () => {
    renderWithProviders(null, { routerRoutes: routes, route: "/" });
    await screen.findByRole("heading", { level: 1, name: "Scouter Power" });
    expect(document.body).toHaveFocus();
    expect(anuncio()).toHaveAttribute("aria-live", "polite");
    expect(anuncio()).toBeEmptyDOMElement();
  });

  it("ao navegar, foca o h1 da nova página e anuncia o título", async () => {
    const { user } = renderWithProviders(null, { routerRoutes: routes, route: "/" });
    await screen.findByRole("heading", { level: 1, name: "Scouter Power" });

    const nav = screen.getByRole("navigation", { name: "Principal" });
    await user.click(within(nav).getByRole("link", { name: "Avaliar" }));

    const titulo = await screen.findByRole("heading", { level: 1, name: "Avaliar minha força" });
    await waitFor(() => expect(titulo).toHaveFocus());
    expect(titulo).toHaveAttribute("tabindex", "-1");
    expect(anuncio()).toHaveTextContent("Avaliar minha força · Scouter Power");
  });

  it("mudar só a query string não rouba o foco", async () => {
    const { router } = renderWithProviders(null, { routerRoutes: routes, route: "/avaliar" });
    await screen.findByRole("heading", { level: 1, name: "Avaliar minha força" });
    const idade = await screen.findByRole("textbox", { name: "Idade (anos)" });
    idade.focus();

    await act(() => router.navigate("/avaliar?exercicio=supino"));
    expect(router.state.location.search).toBe("?exercicio=supino");
    expect(idade).toHaveFocus();
    expect(anuncio()).toBeEmptyDOMElement();
  });
});
