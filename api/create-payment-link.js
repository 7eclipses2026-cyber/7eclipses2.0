const Razorpay = require("razorpay");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return res.status(500).json({ error: "Online payment is not configured yet. Please choose Cash on Delivery or contact us." });
  }

  try {
    const body = req.body || {};
    const quantity = Number(body.quantity);
    const orderId = String(body.orderId || "");
    const customer = body.customer || {};

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      return res.status(400).json({ error: "Invalid cart quantity." });
    }
    if (!/^7E-[0-9]{10,}$/.test(orderId)) {
      return res.status(400).json({ error: "Invalid order reference." });
    }
    if (!String(customer.name || "").trim() || !String(customer.contact || "").trim()) {
      return res.status(400).json({ error: "Please provide your name and phone number." });
    }

    // Validate the promotional code and calculate the discount on the server.
    const couponCode = String(body.couponCode || "").trim().toUpperCase();
    const discount = couponCode === "ECLIPSES5" ? Math.round(quantity * 599 * 0.05) : 0;
    if (couponCode && couponCode !== "ECLIPSES5") {
      return res.status(400).json({ error: "Invalid coupon code." });
    }
    // Never accept a payable amount or discount from the browser.
    const amountRupees = quantity * 599 - discount + (quantity === 1 ? 40 : 0);
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const link = await razorpay.paymentLink.create({
      upi_link: true,
      amount: amountRupees * 100,
      currency: "INR",
      accept_partial: false,
      reference_id: orderId,
      description: "7ECLIPSES T-shirt order " + orderId,
      customer: {
        name: String(customer.name).trim().slice(0, 100),
        contact: String(customer.contact).trim().slice(0, 20),
        ...(customer.email ? { email: String(customer.email).trim().slice(0, 150) } : {})
      },
      notify: { sms: false, email: false },
      reminder_enable: false,
      notes: { order_id: orderId, quantity: String(quantity), ...(couponCode ? { coupon_code: couponCode, discount: String(discount) } : {}) }
    });

    return res.status(200).json({
      short_url: link.short_url,
      payment_link_id: link.id,
      amount: amountRupees
    });
  } catch (error) {
    console.error("Razorpay payment-link creation failed:", error);
    return res.status(502).json({ error: "We couldn't create your UPI payment link. Please try again or choose Cash on Delivery." });
  }
};
