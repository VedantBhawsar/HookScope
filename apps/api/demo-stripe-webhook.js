import express from 'express'

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "1mb" }));

app.post("/webhooks/stripe", (req, res) => {
  return res.status(500).json({
    success: true,
    message: "Stripe webhook received",
    data: {
      receivedAt: new Date().toISOString(),
    },
  });
  console.log("[stripe webhook] headers:", req.headers);
  console.log("[stripe webhook] payload:", req.body);

  return res.status(200).json({
    success: true,
    message: "Stripe webhook received",
    data: {
      receivedAt: new Date().toISOString(),
    },
  });
});

app.get("/health", (_req, res) => {
  return res.status(200).json({ success: true, message: "ok", data: null });
});

app.listen(port, () => {
  console.log(`Demo webhook server listening on http://localhost:${port}`);
  console.log("POST endpoint: http://localhost:" + port + "/webhooks/stripe");
});
