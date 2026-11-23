import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { server } from "./server";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  // jsdom não implementa scrollTo (usado pelo ScrollRestoration).
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    // ignora
  }
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.useRealTimers();
  try {
    window.localStorage.clear();
  } catch {
    // ignora
  }
});

afterAll(() => server.close());
