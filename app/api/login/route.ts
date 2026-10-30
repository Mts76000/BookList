import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { loginSchema } from "@/lib/validation-schemas";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";

const INVALID_CREDENTIALS = "Email ou mot de passe incorrect.";

const ipRateLimiter = createRateLimiter("login", 10, 60 * 15);
// Per-account limit on top of the per-IP one: stops credential stuffing spread across
// many IPs against the same account.
const emailRateLimiter = createRateLimiter("login-email", 5, 60 * 15);

export const POST = withApiErrorHandling(async (request: Request) => {
  const { ip } = requestMetadata(request);
  const rateLimit = await ipRateLimiter.check(ip ?? "unknown");
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de tentatives de connexion. Réessayez plus tard.");
  }

  const validation = await validateBody(loginSchema, request);
  if (!validation.success) return validation.response;
  const { email, password, rememberMe, turnstileToken } = validation.data;

  const emailRateLimit = await emailRateLimiter.check(email.trim().toLowerCase());
  if (!emailRateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de tentatives de connexion. Réessayez plus tard.");
  }

  const turnstileValid = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstileValid) {
    return apiError("VALIDATION_ERROR", "Vérification anti-bot échouée.");
  }

  try {
    const result = await auth.api.signInEmail({
      body: { email, password, rememberMe },
      headers: request.headers,
      asResponse: true,
    });

    if (!result.ok) {
      // Never forward better-auth's raw (English, internal) message: map known codes to
      // fixed French messages, everything else to the generic credentials error.
      const body = await result.json().catch(() => null);
      if (body?.code === "EMAIL_NOT_VERIFIED") {
        return apiError(
          "UNAUTHORIZED",
          "Veuillez vérifier votre adresse email avant de vous connecter.",
        );
      }
      return apiError("UNAUTHORIZED", INVALID_CREDENTIALS);
    }

    // Forward better-auth's session cookie(s) onto our own response envelope.
    const response = apiSuccess({ email }, "Connexion réussie.");
    for (const cookie of result.headers.getSetCookie()) {
      response.headers.append("set-cookie", cookie);
    }
    return response;
  } catch (err) {
    if (err instanceof APIError) {
      return apiError("UNAUTHORIZED", INVALID_CREDENTIALS);
    }
    throw err;
  }
});
