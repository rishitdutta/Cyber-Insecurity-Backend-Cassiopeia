const nodemailer = require('nodemailer');

// Create a reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true', // Convert string to boolean
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify transporter connection at application startup
transporter.verify()
  .then(() => console.log('Email service connected successfully'))
  .catch(err => console.error('Email service connection error:', err));

// Generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send OTP with better error handling and logging
const sendOTP = async (email) => {
  try {
    const otp = generateOTP();
    
    const info = await transporter.sendMail({
      from: `"VaultX Team" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Your OTP for Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">VaultX Security Verification</h2>
          <p>Your one-time password (OTP) is:</p>
          <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <p>Thank you,<br>The VaultX Security Team</p>
        </div>
      `,
    });
    
    console.log('Email sent successfully:', info.messageId);
    return otp; // Return the generated OTP
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send verification email');
  }
};

// Send generic email
const sendEmail = async (to, subject, htmlContent) => {
  try {
    const info = await transporter.sendMail({
      from: `"VaultX Team" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html: htmlContent,
    });
    
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }
};

module.exports = { sendOTP, sendEmail };