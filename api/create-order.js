module.exports = async (req, res) => {
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
    const body = req.body || {};
    const qty = parseInt(body.qty || body.quantity || 0);
    function getPrice(q){
      if(q<=0) return 0;
      if(q===1) return 649;
      if(q===2) return 1149;
      if(q===3) return 1699;
      return 1699 + (q-3)*550;
    }
    let amount = qty>0 ? getPrice(qty) : (parseInt(body.amount)||649);
    const order = await razorpay.orders.create({
      amount: Math.round(amount*100),
      currency: "INR",
      receipt: "7E_"+Date.now(),
      notes: { qty: qty||1, total: amount }
    });
    return res.status(200).json(order);
  } catch(err){
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
  } catch (err) {
    console.error("Razorpay Error:", err);
    return res.status(500).json({ error: err.message, details: String(err) });
  }
}
