import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { registerSchema } from "@/lib/validation-schemas";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { createRateLimiter } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/audit-log";

const rateLimiter = createRateLimiter("register", 5, 60 * 15);

export const POST = withApiErrorHandling(async (request: Request) => {
  const { ip } = requestMetadata(request);
  const rateLimit = await rateLimiter.check(ip ?? "unknown");
  if (!rateLimit.success) {
    return apiError("RATE_LIMITED", "Trop de tentatives d'inscription. Réessayez plus tard.");
  }

  const validation = await validateBody(registerSchema, request);
  if (!validation.success) return validation.response;
  const { name, email, password, turnstileToken } = validation.data;

  const turnstileValid = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstileValid) {
    return apiError("VALIDATION_ERROR", "Vérification anti-bot échouée.");
  }

  try {
    await auth.api.signUpEmail({ body: { name, email, password }, headers: request.headers });
  } catch (err) {
    if (err instanceof APIError) {
      return apiError("CONFLICT", err.message || "Cet email est déjà utilisé.");
    }
    throw err;
  }

  return apiSuccess(
    { email },
    "Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse.",
    201,
  );
});
