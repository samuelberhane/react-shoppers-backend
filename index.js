const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
let admin = require("firebase-admin");
const cors = require("cors");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_SIGNIN_SECRET;
app.use(cors());

const PORT = process.env.PORT || 4242;

// log request
app.use(morgan("tiny"));

const firebaseApp = !admin.apps.length
  ? admin.initializeApp({
      credential: admin.credential.cert({
        type: "service_account",
        project_id: "shoppers-6413a",
        private_key_id: process.env.FIREBASE_SECRET_KEY,
        private_key:
          "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCQSh3I55cwlRbV\nhV1aHRJuf8SmS9+8nbMBJqnMAzFvqKwBg0jGw24Vu+t6Vk5Kk1UMKclWUvI3gglz\ndiBliNjcJrrvkeW0YlaxFe5eeKgV1VcNMf5POaGcIrfU/iqgVBKQ6h3XBle1XFK+\n7mCT+r5w36q1kP7nqE74pVIvACX4jaq1heeFcXdvmmHb6YbjYNAn7BBs5lq8RTlv\n0eAhdDIbQkuU993R/4UjUuZEX7X5e+CL0oBzr6vNEMIDrr/C+MXCprNscBc0Kh59\n8ofOoXQVCJ34BIu63LcL22e02SqiF3ZvvvgT1HIFkvMsGThPrxLanEoVX5JPkKCo\nnacY4ucxAgMBAAECggEAIJxftvSAuz429vM5chB4BflinKMxYhPSTURLxAxEtBPP\nLFhbrnClBMyAIBo5f6lk42beVmBQ1jLRqALet5QCT1+BiHvVCrvfFA783OUwOB8L\nmbPe4lEIMZ23JrB7OdlGiPIg5GROlnLTUMvXkBpvyFsE3hxzQDBOCOx0cqL58f7b\nwglklp5sKZjuFU7Q2vyoOCQRZjvhWkP75SAzhx0AXWdOOLejje+49VdhAowFj+QN\nX1GOwCT6Lg7EyoINlOLG1RL7XqxOt1DjQu8HujP3Y/dpejNwufrPI/tBIkK/63PR\n0U/L7LRT/B1nEdJQMJDBuAge3vdTwtMX9ANRNxc68QKBgQDKxC902T0Lnwce7Rdo\nLAuLM6KhM6YWLe2u+bbSyN2KmUkN/41n27gILy/dCC52p3CCtA230I7Zgn9xJYKY\n591zh/Yf0yibAm4KoXL8yPBU8DL33MuRVFjW5rr3tkTtB+SkbyCKoEL3jPJBxc3U\nfqVjBOhzi3uxU0eu0SmNqG02ZwKBgQC2K7w8VXW0MmE27yah5lFF+joy1KPlUpZ7\n2uZuNqKN4wrOjjGg74RGdVdClRRqvNPC/tjvUoYPsrwhEyX/VH+RsjCIyQ5Ju8zm\nyiNpZvet1flvUzRdX+LqDU2zTc7COxNpdBzIE4m5PIbrn4NIqqcQQwoQ5xzd1lnD\n4i6Hu/IGpwKBgEo9GE8E9tfZaucE0awfbD6UMjgpS+cU+9Azt59nUc3cH6ZTabeb\n975vYGviAfkJhyUjvV4Oqy6yG+0WWcGYKzmQjynJyzUt55JW2F37SBshMtgTbCkS\no9BS/COUBZpvaGRYF6cJ1FsErPIt9RWXJQCjHGSprikXn8g+5qLqBsqDAoGBAJ81\n+AyO8BDt2vLE7nGetjc/ay/Tke4xUN2sQanfTBBPdrlxosQxsNxXX00Mt8xVfYm1\na2k2KX58yljpwFK3ycpO/oX9meQtIvYtgedzm1GtaZO3F1PoIoxF1ju369TrBpsq\nZKEkGkDvOkehoH6Yzuuye5CsPBlRZiCBhAMS6oKPAoGAWh6o5I+TjueAZo0eslex\nReSYgXGnMgeWGxmLB8BBZzTtoVVlyGYIP0bqFuER/AAEhyck2XOpzN2fxw2U3vKn\ncxAjxr9U7f/aGkzPVMYCuAo8YTjFjwWE5wdBJobU+cKfMU8yfrJZjNuean9jB7tT\n5nMM7ubYwk9FBdirZiMLXPs=\n-----END PRIVATE KEY-----\n",
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
  : admin.firebaseApp();

// store user orders in database
const fulfilledOrder = async (session) => {
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

// webhook request
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    let event;

    try {
      event = await stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        endpointSecret
      );
      // Extract the object from the event.
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        return fulfilledOrder(session)
          .then(() => {
            res.status(200);
          })
          .catch((error) =>
            res.status(400).send("Webhook error" + error.message)
          );
      }

      res.sendStatus(200);
    } catch (err) {
      console.log(`❌ Error message: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

// use body parser
app.use(bodyParser.json({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

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
    success_url: `${process.env.FRONTEND_URL}/success`,

    cancel_url: `${process.env.FRONTEND_URL}/cart`,
  });
  res.status(200).json({ id: session.id });
});

app.listen(PORT, () => console.log("Running on port 4242"));
