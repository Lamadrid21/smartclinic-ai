/**
 * 404 fallback for routes that do not exist on the backend.
 */
export function notFound(req, res) {
  res.status(404).json({ success: false, error: "Route not found" });
}

/**
 * Central error handler. Every backend error is returned as a clean JSON
 * response:
 *   { "success": false, "error": "..." }
 * Internal server errors return a generic message so no internals leak out.
 */
export function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-unused-vars
  void next;

  console.error("Unhandled error:", err);

  if (err?.type === "entity.parse.failed") {
    // Malformed JSON request body
    return res.status(400).json({ success: false, error: "Invalid JSON body" });
  }

  const isClientError = typeof err?.status === "number" && err.status >= 400 && err.status < 500;

  res.status(isClientError && err.expose ? err.status : 500).json({
    success: false,
    error: isClientError && err.expose ? err.message : "Something went wrong",
  });
}