import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_HTML_SIZE = 5 * 1024 * 1024; // 5MB limit

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    const { html } = await req.json();

    if (!html) {
      return new Response(
        JSON.stringify({ error: "Missing HTML content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate HTML size
    if (html.length > MAX_HTML_SIZE) {
      console.error(`HTML content too large: ${html.length} bytes`);
      return new Response(
        JSON.stringify({ error: "HTML content too large (max 5MB)" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const browserlessToken = Deno.env.get("BROWSERLESS_TOKEN");
    if (!browserlessToken) {
      return new Response(
        JSON.stringify({ error: "Browserless token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting PDF generation via Browserless /function endpoint...");

    // Build the complete HTML with all print-optimized styles
    const fullHtml = buildFullHtml(html);

    // Use Browserless /function endpoint - allows full puppeteer control
    const functionCode = `
export default async function ({ page, context }) {
  try {
    // Set viewport for consistent rendering (1200px wide for high fidelity)
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2
    });

    // Emulate screen media (not print) to preserve dark theme colors
    await page.emulateMediaType('screen');

    // Set content directly from the provided HTML
    await page.setContent(context.html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    // Small delay to ensure all styles and images are fully rendered
    await new Promise(r => setTimeout(r, 800));

    // Generate PDF directly with printBackground to preserve colors
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: false,
      scale: 0.68,
      margin: {
        top: '0.4in',
        right: '0.4in',
        bottom: '0.4in',
        left: '0.4in'
      }
    });

    return {
      data: pdf,
      type: 'application/pdf'
    };
  } catch (err) {
    console.error('Puppeteer error:', err);
    throw err;
  }
}
`;

    const response = await fetch(
      `https://production-sfo.browserless.io/function?token=${browserlessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: functionCode,
          context: {
            html: fullHtml,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Browserless error response:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate PDF", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`PDF generated successfully for user: ${user.id}`);
    const pdfBuffer = await response.arrayBuffer();

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="pokeiq-report-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (error: unknown) {
    console.error("PDF generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildFullHtml(contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1200">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box !important;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 1200px !important;
      min-width: 1200px !important;
      max-width: 1200px !important;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%) !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
      color: #e2e8f0 !important;
      line-height: 1.6 !important;
    }

    .container {
      width: 1100px !important;
      max-width: 1100px !important;
      margin: 0 auto !important;
      padding: 48px 32px !important;
    }

    .header {
      text-align: center !important;
      margin-bottom: 48px !important;
      padding-bottom: 32px !important;
      border-bottom: 1px solid rgba(139, 92, 246, 0.3) !important;
    }

    .logo {
      font-size: 36px !important;
      font-weight: 700 !important;
      background: linear-gradient(135deg, #a78bfa, #818cf8) !important;
      -webkit-background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
      background-clip: text !important;
      margin-bottom: 8px !important;
    }

    .subtitle {
      color: #94a3b8 !important;
      font-size: 16px !important;
    }

    .stats-grid, .metrics-grid {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 20px !important;
      margin-bottom: 28px !important;
    }

    .stat-card, .metric-card {
      background: rgba(15, 23, 42, 0.6) !important;
      border: 1px solid rgba(139, 92, 246, 0.15) !important;
      border-radius: 14px !important;
      padding: 24px !important;
      text-align: center !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .stat-value, .metric-value {
      font-size: 28px !important;
      font-weight: 700 !important;
      color: #f1f5f9 !important;
      margin-bottom: 6px !important;
    }

    .stat-value.positive, .metric-value.positive, .positive {
      color: #4ade80 !important;
    }

    .stat-value.negative, .metric-value.negative, .negative {
      color: #f87171 !important;
    }

    .stat-label, .metric-label {
      font-size: 13px !important;
      color: #94a3b8 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }

    .section {
      background: rgba(30, 27, 75, 0.5) !important;
      border: 1px solid rgba(139, 92, 246, 0.2) !important;
      border-radius: 18px !important;
      padding: 32px !important;
      margin-bottom: 24px !important;
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.1) !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .section-title {
      font-size: 20px !important;
      font-weight: 600 !important;
      color: #a78bfa !important;
      margin-bottom: 16px !important;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
    }

    .section-title::before {
      content: '' !important;
      width: 4px !important;
      height: 22px !important;
      background: linear-gradient(180deg, #a78bfa, #818cf8) !important;
      border-radius: 2px !important;
    }

    .narrative-block {
      background: rgba(15, 23, 42, 0.4) !important;
      border-left: 3px solid rgba(139, 92, 246, 0.5) !important;
      border-radius: 0 12px 12px 0 !important;
      padding: 24px !important;
      margin-top: 20px !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .narrative-title {
      font-weight: 600 !important;
      color: #c4b5fd !important;
      margin-bottom: 12px !important;
      font-size: 15px !important;
    }

    .narrative-text {
      color: #cbd5e1 !important;
      font-size: 14px !important;
      line-height: 1.7 !important;
    }

    .collector-profile {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(30, 27, 75, 0.6) 100%) !important;
      border: 1px solid rgba(139, 92, 246, 0.3) !important;
      border-radius: 18px !important;
      padding: 32px !important;
      margin-bottom: 28px !important;
      text-align: center !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .collector-type {
      font-size: 30px !important;
      font-weight: 700 !important;
      background: linear-gradient(135deg, #a78bfa, #c4b5fd) !important;
      -webkit-background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
      margin-bottom: 12px !important;
    }

    .collector-desc {
      color: #cbd5e1 !important;
      font-size: 15px !important;
      max-width: 700px !important;
      margin: 0 auto !important;
    }

    .allocation-bar {
      display: flex !important;
      height: 32px !important;
      border-radius: 10px !important;
      overflow: hidden !important;
      margin-bottom: 14px !important;
    }

    .allocation-segment {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      color: white !important;
      min-width: 35px !important;
    }

    .allocation-segment.sealed { background: #8b5cf6 !important; }
    .allocation-segment.slabs { background: #06b6d4 !important; }
    .allocation-segment.raw { background: #f59e0b !important; }

    .allocation-legend {
      display: flex !important;
      gap: 24px !important;
      flex-wrap: wrap !important;
      margin-bottom: 18px !important;
    }

    .legend-item {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      font-size: 13px !important;
      color: #94a3b8 !important;
    }

    .legend-dot {
      width: 12px !important;
      height: 12px !important;
      border-radius: 50% !important;
    }

    .health-score {
      font-size: 52px !important;
      font-weight: 700 !important;
      text-align: center !important;
      margin: 20px 0 !important;
    }

    .health-score.excellent { color: #4ade80 !important; }
    .health-score.good { color: #a3e635 !important; }
    .health-score.fair { color: #fbbf24 !important; }
    .health-score.poor { color: #f87171 !important; }

    .hit-item {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding: 12px 16px !important;
      background: rgba(15, 23, 42, 0.4) !important;
      border-radius: 10px !important;
      margin-bottom: 10px !important;
    }

    .hit-name {
      color: #e2e8f0 !important;
      font-weight: 500 !important;
      font-size: 14px !important;
    }

    .hit-gain {
      color: #4ade80 !important;
      font-weight: 600 !important;
      font-size: 14px !important;
    }

    .insight-item {
      background: rgba(15, 23, 42, 0.4) !important;
      border-radius: 12px !important;
      padding: 16px 20px !important;
      margin-bottom: 12px !important;
      border-left: 3px solid rgba(139, 92, 246, 0.4) !important;
      break-inside: avoid !important;
    }

    .insight-item.strength { border-left-color: rgba(74, 222, 128, 0.5) !important; }
    .insight-item.risk { border-left-color: rgba(251, 191, 36, 0.5) !important; }

    .insight-title {
      font-weight: 600 !important;
      color: #e2e8f0 !important;
      margin-bottom: 6px !important;
      font-size: 14px !important;
    }

    .insight-desc {
      color: #94a3b8 !important;
      font-size: 13px !important;
    }

    .target-allocation-card {
      background: rgba(15, 23, 42, 0.5) !important;
      border: 1px solid rgba(139, 92, 246, 0.2) !important;
      border-radius: 14px !important;
      padding: 20px !important;
      margin-top: 20px !important;
    }

    .target-title {
      font-weight: 600 !important;
      color: #a78bfa !important;
      font-size: 15px !important;
      margin-bottom: 10px !important;
    }

    .target-info {
      color: #e2e8f0 !important;
      font-size: 14px !important;
      margin-bottom: 12px !important;
    }

    .target-note {
      color: #94a3b8 !important;
      font-size: 13px !important;
      font-style: italic !important;
    }

    .action-item {
      display: flex !important;
      align-items: flex-start !important;
      gap: 14px !important;
      padding: 16px !important;
      background: rgba(15, 23, 42, 0.3) !important;
      border-radius: 12px !important;
      margin-bottom: 12px !important;
      break-inside: avoid !important;
    }

    .action-number {
      width: 28px !important;
      height: 28px !important;
      background: linear-gradient(135deg, #a78bfa, #818cf8) !important;
      border-radius: 50% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-weight: 600 !important;
      font-size: 13px !important;
      flex-shrink: 0 !important;
    }

    .closing-section {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(30, 27, 75, 0.5) 100%) !important;
      border: 1px solid rgba(139, 92, 246, 0.3) !important;
      text-align: center !important;
    }

    .footer {
      text-align: center !important;
      padding: 32px !important;
      color: #64748b !important;
      font-size: 12px !important;
      border-top: 1px solid rgba(139, 92, 246, 0.2) !important;
      margin-top: 24px !important;
    }

    @media print {
      html, body {
        background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .section, .narrative-block, .collector-profile, .stat-card, .metric-card, .insight-item, .action-item {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
${contentHtml}
</body>
</html>`;
}
