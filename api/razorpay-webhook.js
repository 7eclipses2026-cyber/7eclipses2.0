const crypto = require("crypto");

module.exports.config = {
  api: { bodyParser: false }
};

const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzlt1idnzdAN_0VZuwqxP7Vt08jUuZIC3-y14kV-cPjHk4MJKx-COC_Jcu6S7zznXh12w/exec";

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing RAZORPAY_WEBHOOK_SECRET");
    return res.status(500).json({ error: "Webhook is not configured." });
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers["x-razorpay-signature"];
    if (typeof signature !== "string") {
      return res.status(400).json({ error: "Missing webhook signature." });
    }

    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const receivedBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      return res.status(401).json({ error: "Invalid webhook signature." });
    }

    const event = JSON.parse(rawBody.toString("utf8"));
    if (event.event !== "payment_link.paid") {
      return res.status(200).json({ received: true, ignored: true });
    }

    const paymentLink = event.payload?.payment_link?.entity;
    if (!paymentLink || paymentLink.status !== "paid") {
      return res.status(200).json({ received: true, ignored: true });
    }

    const orderId = String(
      paymentLink.reference_id || paymentLink.notes?.order_id || ""
    );
    if (!/^7E-[0-9]{10,}$/.test(orderId)) {
      console.error("Paid payment link did not contain a valid 7ECLIPSES order ID.");
      return res.status(200).json({ received: true, ignored: true });
    }

    const sheetResponse = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "updatePayment",
        orderId,
        payment: "Paid",
        paymentLinkId: String(paymentLink.id || ""),
        amount: Number(paymentLink.amount_paid || paymentLink.amount || 0) / 100
      })
    });

    if (!sheetResponse.ok) {
      const detail = await sheetResponse.text();
      console.error("Google Sheet payment update failed:", sheetResponse.status, detail.slice(0, 500));
      return res.status(502).json({ error: "Could not update the order sheet." });
    }

    const sheetResult = await sheetResponse.text();
    if (!/^(OK|UPDATED|SUCCESS)/i.test(sheetResult.trim())) {
      console.error("Google Sheet did not confirm payment update:", sheetResult.slice(0, 500));
      return res.status(502).json({ error: "Google Sheet did not confirm the payment update." });
    }

    return res.status(200).json({ received: true, updated: true, orderId });
  } catch (error) {
    console.error("Razorpay webhook processing failed:", error);
    return res.status(500).json({ error: "Webhook processing failed." });
  }
};
