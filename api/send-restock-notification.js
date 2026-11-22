const OWNER_EMAIL = "7eclipses2026@gmail.com";
const rateLimit = new Map();

function clean(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ sent: false, error: "Method not allowed." });
  }

  const origin = req.headers.origin;
  if (origin) {
    try {
      const host = new URL(origin).hostname;
      if (host !== "7eclipses.com" && host !== "www.7eclipses.com" && !host.endsWith(".vercel.app")) {
        return res.status(403).json({ sent: false, error: "Request origin not allowed." });
      }
    } catch {
      return res.status(403).json({ sent: false, error: "Invalid request origin." });
    }
  }

  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  const now = Date.now();
  const recent = (rateLimit.get(ip) || []).filter(timestamp => now - timestamp < 15 * 60 * 1000);
  if (recent.length >= 8) {
    return res.status(429).json({ sent: false, error: "Too many requests. Please try again later." });
  }
  recent.push(now);
  rateLimit.set(ip, recent);

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESTOCK_FROM_EMAIL;
  if (!apiKey || !from) {
    return res.status(503).json({
      sent: false,
      error: "Email notifications are not configured yet. Add RESEND_API_KEY and RESTOCK_FROM_EMAIL in Vercel."
    });
  }

  const body = req.body || {};
  const productName = clean(body.productName, 80);
  const color = clean(body.color, 30);
  const sizes = Array.isArray(body.sizes)
    ? [...new Set(body.sizes.map(size => clean(size, 30)).filter(Boolean))].slice(0, 12)
    : (clean(body.size, 30) ? [clean(body.size, 30)] : []);
  const source = body.source === "product-viewer" ? "Product viewer" : "Shop restock form";

  if (!productName) {
    return res.status(400).json({ sent: false, error: "A T-shirt name is required." });
  }

  const details = [
    `Product: ${productName}`,
    color ? `Colour: ${color}` : "",
    sizes.length ? `Size(s): ${sizes.join(", ")}` : "Variant: General restock interest",
    `Request source: ${source}`,
    `Received: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} (IST)`
  ].filter(Boolean);

  const html = `<div style="font-family:Arial,sans-serif;color:#10283a;line-height:1.6"><h2 style="color:#164665">A new 7ECLIPSES restock request</h2><p>A customer has requested a restock:</p><ul>${details.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul><p>Open Stock Manager → Stock Requests on your website to review all requests.</p></div>`;
  const text = `A new 7ECLIPSES restock request\n\n${details.join("\n")}\n\nOpen Stock Manager → Stock Requests to review all requests.`;

  try {
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [OWNER_EMAIL],
        subject: `Restock request: ${productName}`,
        html,
        text
      })
    });

    if (!emailResponse.ok) {
      const providerError = await emailResponse.text();
      console.error("Resend restock email failed:", emailResponse.status, providerError.slice(0, 500));
      return res.status(502).json({ sent: false, error: "The email provider could not send the notification." });
    }

    return res.status(200).json({ sent: true });
  } catch (error) {
    console.error("Restock email request failed:", error);
    return res.status(502).json({ sent: false, error: "The email notification could not be sent." });
  }
};
