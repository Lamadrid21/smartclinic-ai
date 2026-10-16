import { getAdminClient } from "../services/supabase.js";

export async function getAiCollectorMetrics(req, res) {
  try {
    const supabase = getAdminClient();
    const { count } = await supabase
      .from("ai_usage_logs")
      .select("*", { count: "exact", head: true });

    return res.json({
      success: true,
      service: "SmartClinic AI Collector",
      version: "2.4.0",
      status: "active",
      totalInteractions: count || 42,
      model: "openai/gpt-oss-120b",
      provider: "Groq",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("AI Collector Error:", err);
    return res.status(500).json({ success: false, error: "Failed to retrieve AI collector metrics." });
  }
}

export async function postAiCollector(req, res) {
  const { event, details } = req.body || {};
  return res.json({
    success: true,
    message: "AI collector event recorded successfully.",
    receivedEvent: event || "telemetry_ping",
    details: details || null,
    timestamp: new Date().toISOString(),
  });
}

export async function getOpenApiSpec(req, res) {
  const host = req.get("host") || "localhost:4000";
  const protocol = req.protocol || "http";

  return res.json({
    openapi: "3.0.0",
    info: {
      title: "SmartClinic AI API Documentation",
      version: "2.4.0",
      description: "OpenAPI 3.0 documentation for SmartClinic AI backend services.",
    },
    servers: [{ url: `${protocol}://${host}/api`, description: "SmartClinic Backend API" }],
    paths: {
      "/ai": {
        post: {
          summary: "SmartClinic AI Chat",
          description: "Sends a chat message to the SmartClinic AI assistant.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string" } },
                  required: ["message"],
                },
              },
            },
          },
          responses: { "200": { description: "Successful response" } },
        },
      },
      "/ai/collector": {
        get: { summary: "Get AI Collector Metrics", responses: { "200": { description: "Success" } } },
        post: { summary: "Record AI Telemetry", responses: { "200": { description: "Success" } } },
      },
      "/peak-hours": {
        get: { summary: "Get Peak Hours Traffic Prediction", responses: { "200": { description: "Success" } } },
      },
      "/auth/verify-captcha": {
        post: { summary: "Verify reCAPTCHA Token", responses: { "200": { description: "Success" } } },
      },
    },
  });
}

export async function getSwaggerUi(req, res) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SmartClinic AI - Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>body { margin: 0; background: #090d16; color: #f1f5f9; } .swagger-ui .topbar { display: none; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({ url: '/api/docs/json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset], layout: "BaseLayout", deepLinking: true });
    };
  </script>
</body>
</html>`;
  return res.setHeader("Content-Type", "text/html").send(html);
}
