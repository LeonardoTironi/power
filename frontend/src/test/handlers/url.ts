/**
 * URL para handlers MSW: casa com qualquer origem ("*"), então funciona com o proxy
 * (/api/v1 relativo) e com VITE_API_URL absoluta. Ex.: http.get(api("/health"), ...).
 */
export const api = (caminho: string) => `*/api/v1${caminho}`;
