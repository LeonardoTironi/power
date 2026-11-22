import { z } from "zod";

/** Mesmo critério do backend (app/models/usuario.py). */
const REGEX_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const email = z
  .string()
  .trim()
  .min(1, "Informe seu e-mail.")
  .max(254, "Deve ter no máximo 254 caracteres.")
  .regex(REGEX_EMAIL, "Informe um e-mail válido.");

export const loginSchema = z.object({
  email,
  senha: z.string().min(1, "Informe sua senha."),
});

export type LoginForm = z.infer<typeof loginSchema>;

export const cadastroSchema = z
  .object({
    nome: z.string().trim().min(1, "Informe seu nome.").max(120, "Deve ter no máximo 120 caracteres."),
    email,
    senha: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .max(128, "A senha deve ter no máximo 128 caracteres."),
    confirmacao: z.string().min(1, "Confirme sua senha."),
    consentimento: z.boolean().refine((v) => v, "É necessário aceitar os termos de uso e privacidade."),
  })
  .refine((dados) => dados.senha === dados.confirmacao, {
    path: ["confirmacao"],
    message: "As senhas não conferem.",
  });

export type CadastroForm = z.infer<typeof cadastroSchema>;
