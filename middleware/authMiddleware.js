const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1️⃣ Check if header exists
  if (!authHeader) {
    return res.status(401).json({ msg: "No token provided" });
  }

  // 2️⃣ Extract token from "Bearer TOKEN"
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "Invalid token format" });
  }

  // 3️⃣ Verify token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    // console.log(decoded.userId)
    if (err) {
      return res.status(403).json({ msg: "Invalid or expired token" });
    }

    req.userId = decoded.userId;
    // console.log(req.userId);
    next();
  });
};

module.exports = authMiddleware;