const ALLOWED_BASE_URLS = new Set([
  "https://track.delhivery.com",
  "https://staging-express.delhivery.com"
]);

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const pin = String(req.query?.pin || "").trim();
  if (!/^[0-9]{6}$/.test(pin)) {
    return res.status(400).json({ error: "Enter a valid 6-digit PIN code." });
  }

  const token = process.env.DELHIVERY_API_TOKEN;
  const baseUrl = String(process.env.DELHIVERY_API_BASE_URL || "").trim().replace(/\/$/, "");

  if (!token || !ALLOWED_BASE_URLS.has(baseUrl)) {
    return res.status(503).json({
      error: "Delhivery serviceability is not configured yet. Please contact the 7ECLIPSES owner."
    });
  }

  try {
    const endpoint = new URL("/c/api/pin-codes/json/", baseUrl);
    endpoint.searchParams.set("filter_codes", pin);

    const upstream = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
        Accept: "application/json"
      }
    });

    const data = await upstream.json().catch(() => null);

    if (upstream.status === 401 || upstream.status === 403) {
      return res.status(502).json({
        error: "Delhivery did not accept the configured API credentials or environment."
      });
    }

    if (!upstream.ok || !data || !Array.isArray(data.delivery_codes)) {
      return res.status(502).json({
        error: "Delhivery could not complete the PIN-code check. Please try again."
      });
    }

    const match = data.delivery_codes.find(item =>
      String(item?.postal_code?.pin || "") === pin
    );
    const postal = match?.postal_code;

    if (!postal) {
      return res.status(200).json({
        pin,
        found: false,
        serviceable: false,
        prepaid: false,
        cod: false,
        reversePickup: false,
        message: "Delhivery has no serviceability record for this PIN code."
      });
    }

    const remarks = String(postal.remarks || "").trim();
    const prepaid = String(postal.pre_paid || "").toUpperCase() === "Y";
    const cod = String(postal.cash ?? postal.cod ?? "").toUpperCase() === "Y";
    const reversePickup = String(postal.pickup || "").toUpperCase() === "Y";
    const serviceable = !remarks && (prepaid || cod);

    return res.status(200).json({
      pin,
      found: true,
      serviceable,
      prepaid,
      cod,
      reversePickup,
      city: postal.city || "",
      state: postal.state_code || "",
      message: serviceable
        ? "This PIN code is serviceable by Delhivery."
        : (remarks || "This PIN code is not currently serviceable for delivery.")
    });
  } catch (error) {
    console.error("Delhivery PIN serviceability request failed:", error?.name || "UnknownError");
    return res.status(502).json({
      error: "We could not reach Delhivery right now. Please try again."
    });
  }
};
