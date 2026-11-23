import { setupServer } from "msw/node";
import { avaliacaoHandlers } from "./handlers/avaliacao";
import { authHandlers } from "./handlers/auth";
import { baseHandlers } from "./handlers/base";
import { historicoHandlers } from "./handlers/historico";

/** Servidor MSW compartilhado. Em cada teste, sobrescreva com server.use(...). */
/** historicoHandlers é o único dono de GET /avaliacoes/historico e GET/DELETE /avaliacoes/:id. */
export const server = setupServer(...baseHandlers, ...authHandlers, ...historicoHandlers, ...avaliacaoHandlers);
