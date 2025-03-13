const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendOTP } = require('../services/emailService');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const { logSecurityEvent } = require('../utils/securityLogger');
const { body, validationResult } = require('express-validator');

// Input validation middleware
exports.validateSignupInput = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/).withMessage('Password must include uppercase, lowercase, number and special character')
];

// Rate limiter setup
const rateLimit = require('express-rate-limit');

exports.otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many attempts, please try again later' }
});

// Step 1: Initial Signup
exports.initiateSignup = async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
   
    if (existingUser) return res.status(400).json({ error: "User already exists" });
    const hashedPassword = await hashPassword(password);
    
    // Generate and hash OTP
    const otpPlaintext = await sendOTP(email);
    const otpHash = await hashPassword(otpPlaintext);
   
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        otp: otpHash, // Store hashed OTP
        otpExpiry: new Date(Date.now() + 10*60*1000) // 10 minutes
      }
    });
    
    // Updated security logging
    await logSecurityEvent(
      null, 
      "SIGNUP_INITIATED", 
      { email }, 
      req.ip, 
      req.headers['user-agent']
    );
    res.status(201).json({ message: "OTP sent to email" });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: "Signup failed", message: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Step 2: Verify OTP for signup
exports.verifySignup = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
   
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ error: "OTP expired" });
    }

    // Compare hashed OTP
    const isValidOTP = await comparePassword(otp, user.otp);
    if (!isValidOTP) {
      await logSecurityEvent(
        user.id,
        "FAILED_OTP_VERIFICATION",
        { email },
        req.ip,
        req.headers['user-agent']
      );
      return res.status(400).json({ error: "Invalid OTP" });
    }

    await prisma.user.update({
      where: { email },
      data: { isVerified: true, otp: null, otpExpiry: null }
    });
    
    // Generate token with expiry
    const token = generateToken(user.id, '24h');
    await logSecurityEvent(
      user.id,
      "ACCOUNT_VERIFICATION",
      { method: "EMAIL" },
      req.ip,
      req.headers['user-agent']
    );
    res.json({ token, message: "Account verified" });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: "Verification failed", message: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Step 3: Complete Profile
exports.completeProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    
    // Input validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "Valid name is required" });
    }
    
    if (phone && !/^\+?[0-9]{10,15}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid phone format" });
    }
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        name, 
        phone, 
        address,
        profileCompleted: true
      }
    });
    
    // Don't return password or sensitive fields
    const { password, otp, otpExpiry, ...safeUserData } = user;
    res.json(safeUserData);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(400).json({ error: "Profile update failed", message: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Modified: Step 1 of Login - Validate credentials and send OTP
exports.initiateLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
   
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.isVerified) return res.status(401).json({ error: "Account not verified" });
   
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      await logSecurityEvent(
        user.id,
        "FAILED_LOGIN_ATTEMPT",
        { 
          email,
          attemptCount: user.failedLoginAttempts + 1
        },
        req.ip,
        req.headers['user-agent']
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Password is correct, now send OTP for 2FA
    const otpPlaintext = await sendOTP(email);
    const otpHash = await hashPassword(otpPlaintext);
    
    // Store hashed OTP in database
    await prisma.user.update({
      where: { email },
      data: { 
        otp: otpHash,
        otpExpiry: new Date(Date.now() + 10*60*1000), // 10 minutes
        loginAttempts: { increment: 1 }
      }
    });
    
    await logSecurityEvent(
      user.id,
      "LOGIN_OTP_SENT",
      { method: "EMAIL" },
      req.ip,
      req.headers['user-agent']
    );
    res.status(200).json({ 
      message: "OTP sent to your email for verification",
      userId: user.id // Send userId for the next step
    });
  } catch (error) {
    console.error('Login initiation error:', error);
    res.status(500).json({ error: "Login initiation failed", message: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Step 2 of Login - Verify OTP and complete login
exports.verifyLogin = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
   
    if (!user) return res.status(404).json({ error: "User not found" });
    
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ error: "OTP expired" });
    }
    
    // Compare hashed OTP
    const isValidOTP = await comparePassword(otp, user.otp);
    if (!isValidOTP) {
      await logSecurityEvent(
        user.id,
        "FAILED_LOGIN_OTP",
        { 
          userId: user.id,
          attemptCount: user.failedLoginAttempts + 1
        },
        req.ip,
        req.headers['user-agent']
      );
      return res.status(400).json({ error: "Invalid OTP" });
    }
    
    // Clear OTP and reset failed attempts after successful verification
    await prisma.user.update({
      where: { id: userId },
      data: { 
        otp: null, 
        otpExpiry: null,
        failedLoginAttempts: 0,
        lastLoginAt: new Date()
      }
    });
    
    // Generate auth token with expiry
    const token = generateToken(user.id, '24h');
    
    await logSecurityEvent(
      user.id,
      "SUCCESSFUL_LOGIN",
      { 
        method: "EMAIL",
        lastLogin: new Date()
      },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name 
      },
      message: "Login successful" 
    });
  } catch (error) {
    console.error('Login verification error:', error);
    res.status(500).json({ error: "Login verification failed", message: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Password reset request
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const otpPlaintext = await sendOTP(email);
    const otpHash = await hashPassword(otpPlaintext);
    
    await prisma.user.update({
      where: { email },
      data: {
        otp: otpHash,
        otpExpiry: new Date(Date.now() + 10*60*1000), // 10 minutes
        passwordResetRequested: true
      }
    });
    
    logSecurityEvent(user.id, "PASSWORD_RESET_REQUESTED");
    res.status(200).json({ message: "Password reset OTP sent" });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: "Password reset request failed" });
  }
};

// Complete password reset
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    // Validate password strength
    if (!/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/.test(newPassword)) {
      return res.status(400).json({ 
        error: "Password must be at least 8 characters and include uppercase, lowercase, number and special character" 
      });
    }
    
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.passwordResetRequested) {
      return res.status(400).json({ error: "No password reset was requested" });
    }
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ error: "OTP expired" });
    }
    
    // Compare hashed OTP
    const isValidOTP = await comparePassword(otp, user.otp);
    if (!isValidOTP) {
      logSecurityEvent(user.id, "FAILED_PASSWORD_RESET_OTP");
      return res.status(400).json({ error: "Invalid OTP" });
    }
    
    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);
    
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        otp: null,
        otpExpiry: null,
        passwordResetRequested: false,
        passwordChangedAt: new Date()
      }
    });
    
    logSecurityEvent(user.id, "PASSWORD_RESET_COMPLETED");
    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: "Password reset failed" });
  }
};