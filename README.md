# Diet Coke Mirror — checkout setup

This site now has real Razorpay checkout with server-side order creation,
signature verification, and an email notification the moment a payment is
captured — via a Razorpay **webhook**, so it fires even if the customer
closes the browser right after paying.

GitHub Pages can't run the `/api` functions (it only serves static files),
so this whole project needs to move to **Vercel**, which serves the same
`index.html` *and* runs `/api/*` as serverless functions from the same
repo — no separate backend host, no CORS issues.

## 1. Push this folder to your GitHub repo

Replace your current site files with everything in this folder (keeps the
same `dietgift.in` content, just adds the `api/` folder, `package.json`,
etc.)

## 2. Connect the repo to Vercel

1. Go to vercel.com → **Add New Project** → import your GitHub repo.
2. Framework preset: "Other" (no build step needed).
3. Deploy. Vercel gives you a `*.vercel.app` URL immediately.
4. In your domain registrar / GitHub Pages settings, point `dietgift.in` at
   Vercel instead (Vercel's dashboard → Domains → add `dietgift.in` and it
   shows you the DNS records to change).

## 3. Add environment variables (Vercel dashboard → your project → Settings → Environment Variables)

Add every variable listed in `.env.example`. In short:

| Variable | Where to get it |
|---|---|
| `RAZORPAY_KEY_ID` | Razorpay dashboard → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | same page — **keep this secret, only goes in Vercel, never in the HTML** |
| `RAZORPAY_WEBHOOK_SECRET` | you invent this string yourself when creating the webhook in step 4 |
| `NOTIFY_EMAIL_USER` | a Gmail address you control |
| `NOTIFY_EMAIL_PASS` | a Gmail **App Password** (not your login password) — see step 5 |
| `NOTIFY_EMAIL_TO` | optional, where the order emails should land |

Redeploy after adding variables (Vercel does this automatically on save,
or push a commit).

## 4. Set up the Razorpay webhook

1. Razorpay dashboard → Settings → Webhooks → **Add New Webhook**.
2. Webhook URL: `https://dietgift.in/api/webhook` (or your `*.vercel.app`
   URL if the domain isn't switched over yet).
3. Secret: make up a random string, put the same string in
   `RAZORPAY_WEBHOOK_SECRET` in Vercel.
4. Active events: check **payment.captured**.
5. Save.

## 5. Create a Gmail App Password

1. On the Gmail account you want to send from, turn on 2-Step Verification
   (Google account → Security).
2. Go to myaccount.google.com/apppasswords, create one for "Mail", copy the
   16-character password.
3. That's `NOTIFY_EMAIL_PASS` — not your normal Gmail password.

## 6. Test before going fully live

Razorpay lets you flip to **Test Mode** in the dashboard and use test card
numbers, without moving real money, while you confirm:

- The checkout popup opens with the right amount.
- A test payment fires the webhook and you get the email.
- A failed/cancelled payment shows the "Payment failed" screen, not a fake
  success.

Then switch back to live keys for real orders. Since your account is
already live, I'd still recommend one real ₹1 test purchase yourself,
end‑to‑end, before sharing the link publicly.

## What each file does

- `index.html` — the storefront. Calls `/api/create-order`, opens Razorpay
  Checkout, then calls `/api/verify-payment` to show an honest result.
- `api/create-order.js` — creates the Razorpay order server-side. The
  price is fixed here (₹3,499/unit), never trusted from the browser.
- `api/verify-payment.js` — checks Razorpay's signature so the success
  screen can't be faked by editing the page.
- `api/webhook.js` — the real source of truth. Razorpay calls this
  directly when a payment is captured; it verifies the signature and
  emails you the order details.

## Limitation to know about

There's no database — order details travel inside the Razorpay order's
`notes` field and are read back out by the webhook. That's enough for a
single-product store like this, but if you later want an order history
page or inventory tracking, that needs a small database added on top.
