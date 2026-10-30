
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const brandRoutes = require("./routes/brandRoutes");
const complianceReviewRoutes = require("./routes/complianceReviewRoutes");

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "BrandGuard API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/reviews", complianceReviewRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

app.use((err, req, res, next) => {
  console.error("API error:", err.message);

  const statusCode = err.status || 500;

  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Something went wrong",
  });
});

module.exports = app;
