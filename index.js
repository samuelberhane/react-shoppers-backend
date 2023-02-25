const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const { buffer } = require("micro");
const morgan = require("morgan");
let admin = require("firebase-admin");
const bodyParser = require("body-parser");
const endpointSecret = process.env.STRIPE_SIGNIN_SECRET;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors());

const PORT = process.env.PORT || 8000;

// log request
app.use(morgan("tiny"));

// use body parser
app.use(bodyParser.json({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

const firebaseApp = !admin.apps.length
  ? admin.initializeApp({
      credential: admin.credential.cert({
        type: "service_account",
        project_id: "shoppers-6413a",
        private_key_id: process.env.FIREBASE_PRIVATE_KEY,
        private_key:
          "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDwRGSAR6Uib3dV\nNk7kIbedUimb/AHpno4WBfhdqvTCstASzl37ymnzibmKevNPj3IKQGVCmxw8QPbR\nRGduMK5vubFF1HjKfT+lKJK/n1PCiGteEsCF9YVpxoxiXBa21FhbRD8CDfPlB9GK\nUOUPdbTEi0s3TrtxpSj/0eJ1nfsb04NZDNPzIX4GU00H0FBL0WEP8P3vaCnpdHt6\n9iJ5nfLfeqs6CRgY4uJnMSOONqUSMyaPDcGX5KS2uJEAcBriAVwql6bgnzz32kT8\nNTtbyOqj5a+D0S7NUmhKcok2h+13gh9JChLeWofmmwlZ2AX1QJCvdPrea76JY+T+\nYtCZoyAXAgMBAAECggEAc6OPNXiGH61DY5VYYg9iVsshMKyZZQ4Fd88Wy0pJNF4o\nrCx76oBw/yCF1wM3EM9LBWkZ83VBITTpNi40k8HFawuWKTRKkLa4h66f9q9h+mp7\nNpNS6waQ2CiSD5Mf8Y4BGqgdpUj+3nglX2tw28B8qO4b3Po9WES0F3A2jQJkxe5X\n5//Yom1MmCZQsDy2M8fjW7pNmlLavOilzFqPgYtooDyckLo6GfgaP9hG59/fuNPi\nTxFVyZyQbqEhsyMJc0eFjAIgY7xCVqTuIUH7jyTifOaeLmLBoEIPT3s3hxXJuHrp\nDvkVfQ0HzDnjDQaQYMOfGGCqHzQK+TWxNQxkJlS50QKBgQD982EKr4D4VlR/CfRf\nDbOxQmZF7ga24uwqqxAPguq4nOGzWMzBgngPrNNhJ+mJe9oF0MQxg9yQ6hNXMhB2\nB2ZKci1wP8tyHwClKOJCMQGBvG+MbXXf7S+QLfIMoUH+4D6relYUkqJGYAL3QLah\nIvhtAifVikfpNrw4qYexqNiURwKBgQDyNL7bl440Q4eCJZmhe30aDIh8/RZurFX7\nfxBtwcOTcSc6THdncF0UuErZ3atoPM+ragzESw4vLmsznIbtzWWpvuC+ra2HWtvR\nRmNlyG/6jmUvoXEQI3Lw1iTOz/MUvwj403yBG+I5pq/4XOkbGc7zrsvxT13M9hgl\nVeTc0DsNsQKBgFdtDEGDfiEAh4JcyPZYXz5tH4x/j2wy3x8pWRQd+/SmfcUikwsj\ngXXUB8lw1iNwsfRClOh+/tYc35+rKqOXlI2YlTAJpl6Zcb1qP8qN2HjziGuN24DF\nxRQb3TKf6Xp3dNvP+AaJHLihoSPB8Z2zzlao4VHQk0UkhNP0+TQebsFNAoGBAJgo\n8s5ZxAipc/QbUwzT26AFx6leBj25HrtE9Dk/xXJXX+GMMGdXe+KMdNmyHQD7UyvJ\nEAQxctPJQafG6i1zIC8nr2GbEq06M2ah5cgHx/GMi50Eu1b8LjWHEtCqa3fZG/XW\nRx2FOvYk9d/93qQb7pvAcHdE+RTOdhTehU0DtFXBAoGARw/8MOXCe4mQoWjXkrhU\nJjXDLEDDQvjijA9claxI4MSp68zFy84f0BTCm6/yNB61S+/DZTBJ5SKe2LTzyoXC\naDIthLqdnk6VAJxJTiTOske5mEdYZ7W/mPlSgHu0TmOWLQ/XIdvYqbGiyLZG87VQ\nEyZZVsNVBn2nCpHur1XgXBY=\n-----END PRIVATE KEY-----\n",
        client_email:
          "firebase-adminsdk-utxe7@shoppers-6413a.iam.gserviceaccount.com",
        client_id: "104437718312042590602",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url:
          "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-utxe7%40shoppers-6413a.iam.gserviceaccount.com",
      }),
    })
  : admin.app();

const fulfilledOrder = async (session) => {
  console.log("session", session);
  return firebaseApp
    .firestore()
    .collection("users")
    .doc(session.metadata.email)
    .collection("orders")
    .doc(session.id)
    .set({
      amount: session.amount_total / 100,
      amount_shipping: session.total_details.amount_shipping / 100,
      images: JSON.parse(session.metadata.images),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
};

// route
// home
app.get("/", (req, res) => {
  res.status(200).send("Welcome to Shoppers api.");
});

// create session
app.post(`/api/create-checkout-session`, async (req, res) => {
  const { cartItems, email } = req.body;

  const transformedItems = cartItems.map((item) => ({
    quantity: item.amount,
    price_data: {
      currency: "usd",
      unit_amount: +item.data.currentPrice * 100,
      product_data: {
        name: `${item.data.vendor} ${item.data.type}`,
        description: item.data.description.slice(0, 120),
        images: [...item.data.imageUrls],
      },
    },
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 650, currency: "usd" },
          display_name: "Standard Delivery",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 1 },
            maximum: { unit: "business_day", value: 3 },
          },
        },
      },
    ],
    metadata: {
      email,
      images: JSON.stringify(cartItems.map((item) => item.data.imageUrls[0])),
    },
    shipping_address_collection: {
      allowed_countries: ["GB", "US", "CA", "ET"],
    },
    line_items: transformedItems,
    mode: "payment",
    success_url: `${process.env.FRONTEND_URL}`,
    cancel_url: `${process.env.FRONTEND_URL}/cart`,
  });
  res.status(200).json({ id: session.id });
});

// webhook
app.post("/api/webhook", async (req, res) => {
  if (endpointSecret) {
    const sig = req.headers["stripe-signature"];
    const requestBuffer = await buffer(req);
    const payload = requestBuffer.toLocaleString();
    let event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);

    console.log("event", event);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        // Then define and call a function to handle the event checkout.session.completed
        console.log("session completed");
        const session = event.data.object;
        console.log("session", session);

      // return fulfilledOrder(session)
      //   .then(() => {
      //     res.status(200);
      //   })
      //   .catch((error) =>
      //     res.status(400).send("Webhook error" + error.message)
      //   );
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }
});

app.listen(PORT, () => {
  console.log(`running on port ${PORT}`);
});

module.exports = {
  config: {
    api: {
      bodyParser: false,
      externalResolver: true,
    },
  },
};
