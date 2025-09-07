const jwt = require("jsonwebtoken");

const SECRET_KEY = "supersecretkey"; // env file

function generateToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (err) {
    return null;
  }
}

module.exports = { generateToken, verifyToken };
