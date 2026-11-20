const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzlt1idnzdAN_0VZuwqxP7Vt08jUuZIC3-y14kV-cPjHk4MJKx-COC_Jcu6S7zznXh12w/exec";
const FIREBASE_API_KEY = "AIzaSyCJ2KbU4YlhrXz2loHdhC_E8nEXVDIaSwE";

async function getVerifiedCustomer(req) {
  const authorization = req.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error("Please log in to your 7ECLIPSES account.");

  const response = await fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" +
      encodeURIComponent(FIREBASE_API_KEY),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: match[1] })
    }
  );

  const result = await response.json().catch(() => ({}));
  const user = result.users && result.users[0];

  if (!response.ok || !user || !user.email) {
    throw new Error("Your login session is invalid or expired. Please log in again.");
  }

  return {
    email: String(user.email).trim().toLowerCase()
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.GOOGLE_SHEETS_SECRET;
  if (!secret) {
    console.error("Missing GOOGLE_SHEETS_SECRET environment variable.");
    return res.status(500).json({ error: "Order service is not configured." });
  }

  try {
    const customer = await getVerifiedCustomer(req);
    const action = String(req.body?.action || "");
    const payload = { action, email: customer.email, secret };

    if (action === "cancelOrder") {
      payload.orderId = String(req.body?.orderId || "").trim();
      if (!/^7E-[0-9]{10,}$/.test(payload.orderId)) {
        return res.status(400).json({ error: "Please select a valid order." });
      }
    } else if (action !== "getMyOrders") {
      return res.status(400).json({ error: "Unsupported order action." });
    }

    const sheetResponse = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow"
    });

    const raw = await sheetResponse.text();
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      console.error("Unexpected Google Sheets response:", raw.slice(0, 300));
      return res.status(502).json({ error: "The order service returned an invalid response." });
    }

    if (!sheetResponse.ok || !result.success) {
      return res.status(400).json({
        error: result.message || "We couldn't complete that order request."
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    const message = error.message || "Order request failed.";
    const status = /log in|login session/i.test(message) ? 401 : 500;
    if (status === 500) console.error("My orders API error:", error);
    return res.status(status).json({ error: message });
  }
};
