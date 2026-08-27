import { z } from "zod";
import { apiError } from "@/lib/api-response";

type ValidationResult<T> = { success: true; data: T } | { success: false; response: Response };

/**
 * Parses and validates a request's JSON body against a Zod schema.
 * On failure, returns a ready-to-return apiError(VALIDATION_ERROR) response.
 */
export async function validateBody<T>(
  schema: z.ZodType<T>,
  request: Request,
): Promise<ValidationResult<T>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return {
      success: false,
      response: apiError("VALIDATION_ERROR", "Request body must be valid JSON."),
    };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      success: false,
      response: apiError("VALIDATION_ERROR", "Invalid request body.", z.treeifyError(parsed.error)),
    };
  }

  return { success: true, data: parsed.data };
}
