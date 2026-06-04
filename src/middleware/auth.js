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

function getTokenFromHeader(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.substring(7);
}

function authenticateRequest(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) {
    return res.status(401).json({ success: false, message: "Missing Authorization header" });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }

  req.user = user;
  next();
}

module.exports = { generateToken, verifyToken, authenticateRequest, getTokenFromHeader };
