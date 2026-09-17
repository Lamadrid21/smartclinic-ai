import { createClient } from "@supabase/supabase-js";
import config from "../config/env.js";

let adminClient = null;

/**
 * Server-side Supabase client using the SERVICE ROLE key.
 * Can bypass RLS and manage data across all users.
 * NEVER ship this key to the frontend/browser.
 */
export function getAdminClient() {
  if (!adminClient) {
    adminClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  }
  return adminClient;
}

/**
 * Supabase client that authenticates as the user whose JWT is passed in the
 * Authorization header. Used to verify sessions and to run queries under the
 * user's own RLS permissions.
 */
export function createUserClient(authorizationHeader = "") {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorizationHeader || "",
      },
    },
  });
}