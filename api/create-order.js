module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const Razorpay = require('razorpay');
    
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // === OFFER LOGIC: 3 ke liye 1699, har single tshirt pe continue ===
    // 1 = 599, 2 = 1149, 3 = 1699, 4 = 2249...
    const body = req.body || {};
    const qty = parseInt(body.qty) || 0;
    const BASE = 599;
    const EXTRA = 550;
    
    let amount;
    if (qty > 0) {
      // Qty se auto calculate: 3 ke liye 1699
      amount = BASE + (qty - 1) * EXTRA;
    } else {
      // Agar frontend se direct amount bheja ho to wahi use karo
      amount = body.amount || 1149;
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: "7E_" + Date.now(),
    });

    return res.status(200).json(order);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
