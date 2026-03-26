const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");

dotenv.config();
/* =========================
   SIGNUP API
========================= */
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // 2. Check if user already exists
    const [existingUser] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Insert user
    await db.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword],
    );

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* =========================
   LOGIN API
========================= */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // 2. Find user
    const [rows] = await db.query(
      "SELECT id, password,name FROM users WHERE email = ?",
      [email],
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 4. Generate JWT
    const token = jwt.sign({ userId: rows[0].id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    // console.log(rows);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user_id: rows[0].id,
      user_name: rows[0].name,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const [users] = await db.query(
      "SELECT id, email FROM users WHERE email = ?",
      [email],
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];

    const resetToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await db.query(
      "UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?",
      [resetToken, tokenExpiry, user.id],
    );

    // ✅ RESPOND IMMEDIATELY
    res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
    });

    // 🔥 SEND EMAIL IN BACKGROUND
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    transporter.sendMail({
      from: `"Task Manager Support" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Task Manager – Password Reset",
      html: `
  <h3>Password Reset</h3>
  <p>You requested to reset your Task Manager password.</p>
  <p>Click the link below to reset your password:</p>
  <a href="${resetLink}">${resetLink}</a>
  <p>This link expires in 15 minutes.</p>
`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // 🔐 Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId;

    // 🔒 Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🧠 Update password in DB
    await db.query("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      userId,
    ]);

    return res.status(200).json({
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Reset link expired" });
    }

    return res.status(400).json({ message: "Invalid reset link" });
  }
};

module.exports = { signup, login, forgotPassword, resetPassword };
