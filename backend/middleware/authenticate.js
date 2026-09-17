import { createUserClient } from "../services/supabase.js";

/**
 * Verifies the Supabase session token sent through the Authorization header.
 * On success, attaches req.user, req.authHeader and req.supabase (an
 * authenticated Supabase client) so downstream controllers/services can use
 * them. Returns a JSON 401 response when the token is missing or invalid.
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, error: "Not authenticated" });
    }

    const supabase = createUserClient(authHeader);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return res
        .status(401)
        .json({ success: false, error: "Not authenticated" });
    }

    req.user = user;
    req.authHeader = authHeader;
    req.supabase = supabase;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res
      .status(401)
      .json({ success: false, error: "Not authenticated" });
  }
}