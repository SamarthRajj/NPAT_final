const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.JWT_SECRET || "dev-only-change-in-production";

function generateToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: "24h" });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (err) {
    return null;
  }
}

module.exports = { generateToken, verifyToken };
