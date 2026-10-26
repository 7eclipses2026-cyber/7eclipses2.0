export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const Razorpay = (await import("razorpay")).default;
    
    const body = req.body || {};
    let qty = parseInt(body.qty || body.quantity || 0);
    let amount;

    // ===== 7ECLIPSES OFFER LOGIC =====
    // 1 = 649, 2 = 1149, 3 = 1699, har extra +550
    function getOfferPrice(q) {
      if (q <= 0) return 0;
      if (q === 1) return 649;
      if (q === 2) return 1149;
      if (q === 3) return 1699;
      // 4 onwards: 1699 + (qty-3)*550
      return 1699 + (q - 3) * 550;
    }

    if (qty > 0) {
      amount = getOfferPrice(qty);
    } else if (body.amount) {
      amount = parseInt(body.amount);
    } else {
      amount = 649; // default for direct GET test
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || process.env.RAZO_Y_ID || process.env.RAZORPAY_KEY_ID_LIVE,
      key_secret: process.env.RAZORPAY_KEY_SECRET || process.env.RAZO_cret || process.env.RAZORPAY_KEY_SECRET_LIVE,
    });

    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `order_${Date.now()}`,
      notes: {
        qty: qty || 1,
        offer: `${qty || 1} tees for ${amount}`
      }
    };

    const order = await razorpay.orders.create(options);
    return res.status(200).json(order);
  } catch (err) {
    console.error("Razorpay Error:", err);
    return res.status(500).json({ error: err.message, details: String(err) });
  }
}
    return res.status(200).json(order);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
