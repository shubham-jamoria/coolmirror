const Razorpay = require('razorpay');

// The real price lives here on the server, not in the browser.
const UNIT_PRICE_PAISE = 349900; // ₹3,499.00

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { qty, name, phone, address } = req.body || {};
    const quantity = Math.max(1, Math.min(20, parseInt(qty, 10) || 1));

    if (!name || !phone || !address) {
      return res.status(400).json({ error: 'Missing customer details' });
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await instance.orders.create({
      amount: quantity * UNIT_PRICE_PAISE,
      currency: 'INR',
      receipt: 'dcm_' + Date.now(),
      // These notes travel with the order/payment and are what the
      // webhook reads to build the notification email — no database needed.
      notes: {
        name: String(name).slice(0, 200),
        phone: String(phone).slice(0, 30),
        address: String(address).slice(0, 500),
        qty: String(quantity),
      },
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('create-order error', err);
    return res.status(500).json({ error: 'Could not create order' });
  }
};
