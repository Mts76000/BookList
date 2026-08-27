import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Le nom est requis.").max(100),
  email: z.email("Adresse email invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
  tosAccepted: z.literal(true, { error: "Vous devez accepter les CGU." }),
  turnstileToken: z.string().min(1, "Vérification anti-bot manquante."),
});

export const loginSchema = z.object({
  email: z.email("Adresse email invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
  rememberMe: z.boolean().optional().default(false),
  turnstileToken: z.string().min(1, "Vérification anti-bot manquante."),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Adresse email invalide."),
  turnstileToken: z.string().min(1, "Vérification anti-bot manquante."),
});
