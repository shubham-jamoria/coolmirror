const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Razorpay signs the raw request body, so we must read it ourselves
// instead of letting Vercel parse it as JSON first.
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  let raw = '';
  for await (const chunk of req) raw += chunk;

  const signature = req.headers['x-razorpay-signature'];
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(raw)
    .digest('hex');

  if (!signature || signature !== expected) {
    console.warn('webhook: bad signature');
    return res.status(400).send('Invalid signature');
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch (err) {
    return res.status(400).send('Bad JSON');
  }

  // payment.captured fires once Razorpay has actually settled the payment —
  // this is the trustworthy moment to notify you, independent of whether
  // the customer's browser stayed open.
  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const notes = payment.notes || {};
    const amountRupees = (payment.amount / 100).toFixed(2);

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.NOTIFY_EMAIL_USER,
          pass: process.env.NOTIFY_EMAIL_PASS, // Gmail App Password, not your login password
        },
      });

      await transporter.sendMail({
        from: process.env.NOTIFY_EMAIL_USER,
        to: process.env.NOTIFY_EMAIL_TO || process.env.NOTIFY_EMAIL_USER,
        subject: `Paid order — ₹${amountRupees} — ${notes.name || 'unknown customer'}`,
        text: [
          'A payment was captured on the Diet Coke Mirror site.',
          '',
          `Payment ID: ${payment.id}`,
          `Order ID: ${payment.order_id}`,
          `Amount: ₹${amountRupees}`,
          `Quantity: ${notes.qty || '1'}`,
          '',
          'Customer',
          `Name: ${notes.name || '-'}`,
          `Phone: ${notes.phone || '-'}`,
          `Address: ${notes.address || '-'}`,
        ].join('\n'),
      });
    } catch (err) {
      // Log but still acknowledge the webhook — an email hiccup shouldn't
      // make Razorpay think the webhook failed and keep retrying forever.
      console.error('webhook: email send failed', err);
    }
  }

  return res.status(200).send('ok');
};

module.exports.config = {
  api: { bodyParser: false },
};
