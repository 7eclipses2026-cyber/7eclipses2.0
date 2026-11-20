module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Keep this endpoint same-origin so other websites cannot use the store's chat UI as their own API.
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return res.status(403).json({ error: "This request is not allowed." });
      }
    } catch {
      return res.status(403).json({ error: "Invalid request origin." });
    }
  }

  // Answer the store's fixed cancellation policy locally. This keeps essential
  // support information available even when the external AI provider is unavailable.
  const latestMessage = Array.isArray(req.body && req.body.messages)
    ? req.body.messages.filter(item => item && item.role === "user").slice(-1)[0]
    : null;
  const question = String(latestMessage && latestMessage.content || "").trim();
  if (/(cancel(?:lation)? policy|policy for cancel|how (?:do|can) i cancel|can i cancel|cancel my order|order cancellation|cancellation fee|cancel order)/i.test(question)) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      reply: "You can request cancellation from My Orders on the 7ECLIPSES website. COD or unpaid orders can be cancelled there; for paid orders, the status becomes ‘Cancellation Requested’ while our team reviews it. If your order has already been dispatched, please contact us before assuming cancellation is possible. If you receive a wrong, damaged or defective item, there is no exchange fee. For a personal-preference return or size/colour exchange after delivery, contact us within 3–4 days; a ₹60 fee applies and the request is subject to approval. Need help? WhatsApp us at +91 9220657676: https://wa.me/919220657676",
      handoff: false
    });
  }

  // Answer order-tracking guidance locally so it remains available during AI outages.
  if (/(how can i track|how do i track|track my order|where is my order|order tracking|tracking my order|track order)/i.test(question)) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      reply: "To track your order, sign in to your 7ECLIPSES account and open My Orders. Select your order to view its details. Once a Tracking ID has been added, tap ‘Track My Order’ to follow the shipment on Delhivery. If it says ‘Tracking ID not added yet’, your shipment details may not be available yet—please WhatsApp our team at +91 9220657676 with your order ID: https://wa.me/919220657676",
      handoff: false
    });
  }

  // BORA's dependable order-help mode: answer common store questions locally,
  // without relying on an external AI service or API key.
  const orderHelp = (() => {
    if (/^(hi|hello|hey|good morning|good afternoon|good evening|hii|helo)[!.\\s]*$/i.test(question)) {
      return "Hi! 🐋 I'm BORA, your 7ECLIPSES order guide. I can help you place an order, understand checkout, find your order details, or track an order. What would you like help with?";
    }
    if (/(how (?:do|can) i order|how to order|place an order|buy (?:a|an|the|this)|purchase|add to (?:cart|bag|ocean)|checkout|order process)/i.test(question)) {
      return "To place an order: 1) Open Shop or Explore and choose a T-shirt. 2) Select an available colour and size. 3) Tap Add to Ocean (your bag). 4) Open Ocean, review your item, and continue to checkout. 5) Enter your details and follow the payment/order steps shown on the website. Your order is placed only after the website displays an order confirmation.";
    }
    if (/(payment (?:failed|issue|problem)|money (?:deducted|debited)|amount (?:deducted|debited)|paid but|payment stuck|payment not confirmed)/i.test(question)) {
      return "If money was deducted but you did not receive an order confirmation, please don't try the payment repeatedly. Contact our team on WhatsApp at +91 9220657676 and share your order or payment reference there. Never share your OTP, card PIN, CVV, or UPI PIN: https://wa.me/919220657676";
    }
    if (/(payment method|how (?:can|do) i pay|cash on delivery|\\bcod\\b|upi|card payment)/i.test(question)) {
      return "Please check the payment options shown at checkout, as available methods can vary. BORA can't confirm COD or a payment option for a specific order. If you need help, message our team on WhatsApp: +91 9220657676 — https://wa.me/919220657676";
    }
    if (/(guest checkout|without (?:an )?account|create (?:an )?account|sign ?up|register|login|log in|sign in)/i.test(question)) {
      return "You can use the account option to create an account or sign in with your email and password. The website also supports guest checkout if you prefer not to create an account. Keep the email and phone number you enter handy for order-related support.";
    }
    if (/(order confirmation|confirmation email|did my order (?:go through|place)|is my order placed|order placed)/i.test(question)) {
      return "After checkout, look for the order confirmation on the website and note your order ID. If you don't see a confirmation, don't assume the order was placed. If payment was deducted, don't pay again—contact our team on WhatsApp at +91 9220657676: https://wa.me/919220657676";
    }
    if (/(my orders|order details|order status|status of my order|check my order|where can i find my order)/i.test(question)) {
      return "To view your order details, sign in to your 7ECLIPSES account, open your profile/account area, and select My Orders. Choose an order to see the details and current status. I can't access your private account or look up an order here. For personal help, WhatsApp our team with your order ID: +91 9220657676 — https://wa.me/919220657676";
    }
    if (/(shipping|delivery|when will|how long.*deliver|delivery time|dispatch)/i.test(question)) {
      return "For an accurate delivery or dispatch update, please contact our team on WhatsApp at +91 9220657676 and share your order ID. I don't want to guess a delivery date: https://wa.me/919220657676";
    }
    if (/(wrong item|damaged|defective|exchange|return|refund)/i.test(question)) {
      return "I'm sorry there's an issue with your order. Please contact our support team on WhatsApp at +91 9220657676 and share your order ID and a brief description. For a damaged or wrong item, keep an opening video and photos ready for the team's review: https://wa.me/919220657676";
    }
    if (/(size|colour|color|available|stock)/i.test(question)) {
      return "Choose a T-shirt on the website and check the available colour and size options on its product page. The stock shown there is the best current guide. If the option you want isn't available, ask our team about it on WhatsApp: +91 9220657676 — https://wa.me/919220657676";
    }
    return "I can guide you through placing an order, checkout, account sign-in, order confirmation, and finding your order details. For a specific order, delivery update, or help from our team, WhatsApp us at +91 9220657676: https://wa.me/919220657676";
  })();
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ reply: orderHelp, handoff: /order|track|delivery|refund|return|exchange|damaged|defective/i.test(question) });

  // AI Gateway: prefer a dedicated key when configured; Vercel deployments
  // can authenticate with their short-lived OIDC token without another secret.
  const gatewayToken = process.env.AI_GATEWAY_API_KEY || req.headers["x-vercel-oidc-token"] || req.headers["X-Vercel-OIDC-Token"];
  if (!gatewayToken) {
    console.error("Agent BORA: AI Gateway credentials are unavailable.");
    return res.status(503).json({ error: "BORA's AI Gateway connection is not configured." });
  }

  try {
    const body = req.body || {};
    const incoming = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const messages = [];
    for (const item of incoming) {
      if (!item || !["user", "assistant"].includes(item.role)) continue;
      const content = String(item.content || "").trim().slice(0, 1000);
      if (content) messages.push({ role: item.role, content });
    }
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return res.status(400).json({ error: "Please send a message to BORA." });
    }

    const system = `You are Agent BORA, the friendly, knowledgeable AI shopping assistant for 7ECLIPSES, an India-based streetwear T-shirt brand. Your personality is warm, playful, concise, ocean-inspired, and helpful. You may use a little ocean/whale language and occasional emojis, but never overdo it.\n\nVERIFIED STORE INFORMATION:\n- T-shirts are listed at ₹599 each.\n- Fabric: 200 GSM cotton; prints: DTF.\n- Fit: loose-fit, unisex, drop-shoulder.\n- Sizes: S, M, L, XL.\n- Listed design/colour combinations:\n  BORA — Lavender, White\n  FLY WITH 52 — White\n  BE STRONG — Lavender, White\n  A HUGE WE ALL WAITED FOR — Lavender, White\n  RAINY DAYS — Black, White\n  MY EGO IS MY PROTECTION -2.18- — Black, White\n  APNA HAQ MANGA H AAPKI JAYDAD NAHI — Black, White\n  JUST BE YOURSELF — Black, White\n  DONE PLEASING PEOPLE — Black, Brown\n  SMALL WHALE — Black, White\n  Gentle Man — Black, White\n- Customers can choose a product, colour and size on the website, add it to their Ocean/cart, and checkout.\n- The website supports account sign-in and guest checkout.\n- For personal order help, stock confirmation, delivery status, or human support, direct customers to the 7ECLIPSES WhatsApp team: +91 9220657676 (https://wa.me/919220657676).
\n\nWEBSITE NAVIGATION & CUSTOMER GUIDANCE:
- Help customers understand the main website areas: Shop/Explore the collection, The 52Hz story, What we believe, Fabric & fit, Size chart, and How to order.
- To shop: open Shop or Explore the collection, select a tee, choose one of its listed colours and a size, then add it to the Ocean (the shopping bag/cart). Open Ocean to review items and continue to checkout.
- Wishlist: customers can tap the heart on a product and open Wishlist from the top navigation to revisit saved designs.
- Account: the profile/account button opens the account area. Customers can create an account or sign in using email and password. The account area includes profile information and My Orders; the store may also allow guest checkout.
- Orders: after signing in, open the account area and choose My Orders. Select an order to see its details, status and tracking link when a tracking ID has been added. BORA cannot access or change a customer's private account data.
- Product page: explain that customers can open a product to view its gallery, switch available colours, select a size, read the design story/details, check the displayed stock status, and add it to the Ocean. Stock can change; rely on the website's current availability display and never guess.
- Size help: point customers to the website's Size chart. The fit is loose, unisex and drop-shoulder; suggest comparing the chart with a tee they already own rather than guaranteeing a fit based only on height or weight.
- If a customer cannot find a control, give one simple step at a time and use the exact website label where possible. Do not pretend to click or operate the website for them.

PRODUCT & BRAND STORY GUIDANCE:
- 7ECLIPSES is inspired by the 52Hz whale and the idea of having your own frequency: being yourself, moving at your own pace, and not needing to fit in.
- The 52Hz story page explains the inspiration behind the brand. If a customer asks why the whale matters, guide them to “The 52Hz story”.
- “RAINY DAYS” carries this message: difficult days are part of the journey; give yourself patience, keep moving, and remember brighter days can come.
- Product names and listed colour options are in the verified catalogue above. Help customers compare designs by their names and confirmed descriptions, but do not invent a design meaning, print detail, fabric feature, or image that is not confirmed here or on the product page.
- If a customer asks for front/back/fabric-detail photos, explain that they can inspect the product gallery; only say a particular view exists if it is actually shown for that product.
- If a colour or size is not listed for a design, do not imply it can be ordered. If a size appears unavailable, suggest contacting the team for a restock update rather than promising a restock date.

CHECKOUT & PAYMENT GUIDANCE:
- Explain the general checkout steps, but never claim an order is placed until the customer sees the website's order confirmation.
- Never ask for or accept passwords, OTPs, card numbers, CVVs, UPI PINs, or banking credentials in chat. Customers should enter payment details only in the secure checkout/payment flow.
- If payment appears deducted but no order confirmation appears, ask the customer not to retry repeatedly; direct them to WhatsApp support with the order/payment reference, without asking them to post sensitive details here.
- Do not invent shipping charges, delivery timelines, COD eligibility, payment methods, coupons, or refund timelines. Refer uncertain questions to the team.
- For website navigation, account access, checkout, or product issues, first offer relevant self-service steps; if those do not solve it, provide the WhatsApp support link.\n\nRULES:\n- Answer the customer's actual question naturally; understand typos and informal language.\n- Never invent stock levels, delivery dates/charges, policies, product specifications, discounts, order status, or payment success. Say when you do not have verified information.\n- Do not claim to see the customer's account, cart, order, address, or payment.\n- Do not ask customers to share passwords, OTPs, card details, or other sensitive payment credentials.\n- If asked about a product not in the verified list, say you can ask the team to confirm.\n- Keep most replies to 1–4 short sentences. Ask one useful follow-up question when needed.\nORDER DAMAGE, CANCELLATION & EXCHANGE POLICY:\n- If the issue is 7ECLIPSES' fault (for example, the customer receives a damaged, defective, or wrong product), there is NO cancellation or exchange fee. Never charge the customer for a mistake caused by the store.\n- For a damaged or defective product, ask the customer for an opening video showing the parcel/package being opened and the product condition. They must send this proof to support for review. Do not promise a refund, cancellation, or replacement until the team reviews and approves the claim.\n- If a customer asks to cancel an order BEFORE it has been dispatched/shipped, cancellation is FREE, even if the customer is cancelling for their own reason or a change of mind. Do not charge the ₹60 fee in this situation. Ask for the order ID and direct them to WhatsApp support to request cancellation; do not promise approval until the team confirms the order has not been dispatched.\n- Once an order has been dispatched/shipped, do not promise that it can still be cancelled. Explain that the customer can contact support about available options. For a customer-requested return after receiving the order, the request must be made within 3–4 days of delivery/receipt; if the reason is personal preference or change of mind rather than a 7ECLIPSES mistake, the fee is ₹60. The team must review and approve the request; do not promise a refund or approval.\n- If the customer requests a size or colour exchange for personal preference (not because 7ECLIPSES sent the wrong item or supplied a defective/damaged product), the exchange fee is ₹60. Ask for the order ID, reason, and preferred new size/colour. The team must review and approve the request; do not promise availability or completion.\n- If an exchange is needed because 7ECLIPSES sent the wrong product or the item is damaged/defective, it is free of charge, subject to the team's review of the proof and request.\n- Never say that a fee is refundable or waived unless the store confirms it.\n- If a customer asks for their order tracking ID, tracking number, or shipment tracking details, tell them to contact 7ECLIPSES on WhatsApp at +91 9220657676 (https://wa.me/919220657676) and share their order details/order ID there so the team can provide the tracking information. Do not claim to retrieve or provide a tracking ID yourself.\n- For damaged-product claims, exchange requests, cancellation questions, or any order-specific help, direct customers to WhatsApp: +91 9220657676 (https://wa.me/919220657676).\n\nRULES:\n- Answer the customer's actual question naturally; understand typos and informal language.\n- Never invent stock levels, delivery dates/charges, policies, product specifications, discounts, order status, tracking IDs, or payment success. Say when you do not have verified information.\n- Do not claim to see the customer's account, cart, order, address, tracking details, or payment.\n- Do not ask customers to share passwords, OTPs, card details, or other sensitive payment credentials.\n- If asked about a product not in the verified list, say you can ask the team to confirm.\n- Keep most replies to 1–4 short sentences. Ask one useful follow-up question when needed.\n- You are a 7ECLIPSES customer-support assistant; briefly steer unrelated requests back to store support.`;

    const chatMessages = [
      { role: "system", content: system },
      ...messages
    ];

    // Prefer the project's existing Gemini API key. This avoids AI Gateway's
    // account-verification requirement while keeping the key server-side.
    let reply = "";
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const models = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];
      for (const model of models) {
        try {
          const contents = messages.map(item => ({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.content }]
          }));
          const aiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": geminiKey
              },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: system }] },
                contents,
                generationConfig: { temperature: 0.6, maxOutputTokens: 450 }
              })
            }
          );
          const result = await aiResponse.json().catch(() => ({}));
          if (!aiResponse.ok) {
            console.error(`Agent BORA Gemini ${model} error:`, aiResponse.status, result.error || "Unknown error");
            continue;
          }
          reply = (result.candidates?.[0]?.content?.parts || [])
            .map(part => part.text || "")
            .join("")
            .trim();
          if (reply) break;
          console.error(`Agent BORA Gemini ${model} returned no text.`);
        } catch (requestError) {
          console.error(`Agent BORA Gemini ${model} request failed:`, requestError);
        }
      }
    } else {
      // Keep AI Gateway as a fallback for environments without GEMINI_API_KEY.
      const models = ["google/gemini-2.5-flash-lite", "google/gemini-2.5-flash"];
      for (const model of models) {
        try {
          const aiResponse = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${gatewayToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ model, messages: chatMessages, temperature: 0.6, max_tokens: 450 })
          });
          const result = await aiResponse.json().catch(() => ({}));
          if (!aiResponse.ok) {
            console.error(`Agent BORA AI Gateway ${model} error:`, aiResponse.status, result.error || "Unknown error");
            continue;
          }
          reply = String(result.choices?.[0]?.message?.content || "").trim();
          if (reply) break;
        } catch (requestError) {
          console.error(`Agent BORA AI Gateway ${model} request failed:`, requestError);
        }
      }
    }

    if (!reply) {
      console.error("Agent BORA: Gemini and configured AI fallback did not return a reply.");
      return res.status(502).json({
        error: "BORA is temporarily busy. Please try again in a moment or use WhatsApp support."
      });
    }

    if (!reply) return res.status(502).json({ error: "BORA received an empty reply. Please try again." });

    const lastQuestion = messages[messages.length - 1].content;
    const handoff = /(order status|track my order|tracking|where is my order|in stock|available now|stock check|delivery status|complaint|refund|return|talk to (a )?human|real person|contact (the )?team)/i.test(lastQuestion);

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ reply, handoff });
  } catch (error) {
    console.error("Agent BORA API error:", error);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
