import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { loginSchema } from "@/lib/validation-schemas";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";

const rateLimiter = createRateLimiter("login", 10, 60 * 15);

export const POST = withApiErrorHandling(async (request: Request) => {
  const { ip } = requestMetadata(request);
  const rateLimit = await rateLimiter.check(ip ?? "unknown");
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de tentatives de connexion. Réessayez plus tard.");
  }

  const validation = await validateBody(loginSchema, request);
  if (!validation.success) return validation.response;
  const { email, password, rememberMe, turnstileToken } = validation.data;

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
      const body = await result.json().catch(() => null);
      return apiError("UNAUTHORIZED", body?.message ?? "Email ou mot de passe incorrect.");
    }

    // Forward better-auth's session cookie(s) onto our own response envelope.
    const response = apiSuccess({ email }, "Connexion réussie.");
    for (const cookie of result.headers.getSetCookie()) {
      response.headers.append("set-cookie", cookie);
    }
    return response;
  } catch (err) {
    if (err instanceof APIError) {
      return apiError("UNAUTHORIZED", "Email ou mot de passe incorrect.");
    }
    throw err;
  }
});
