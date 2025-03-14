const { PrismaClient, InvestmentType } = require("@prisma/client");
const prisma = new PrismaClient();
const { sendOTP } = require("../services/emailService");
const {
  hashPassword,
  comparePassword,
  generateToken,
} = require("../utils/auth");
const { logSecurityEvent } = require("../utils/securityLogger");
const { body, validationResult } = require("express-validator");
const { investmentSchema } = require("../middleware/investmentvalidator");
const { date } = require("joi");

// Pass the existing user ID

exports.Investment = async (req, res) => {
  const { userId, amount, type } = req.body;

  try {
    //VALIDATE AMOUNT IN NUMBER ONLY
    const { error, value } = await investmentSchema.validate({ amount });
    if (error) {
      res.status(401).json({ success: false, message: "amount is invalid" });
    }
    const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      
      const asset = await prisma.asset.findFirst({
        where: { userId: userId },
      });
      
      console.log(user);
      console.log(asset);
      
    if (!user || !user.isVerified) {
      return res
        .status(401)
        .json({ success: false, message: "Unathorized or check balance" });
    }
    //VALIDATE AMOUT IS LESS THAN BALANCE
    
    if (asset.balance < amount) {
      return res.status(401).json({ success: false, message: "check balance" });
    }
    const email = user.email;
    const otpPlaintext = await sendOTP(email);
    const otpHash = await hashPassword(otpPlaintext);
    const result = await prisma.user.update({
      where: { id: userId },
      data: {
        otp: otpHash,
        otpExpiry: new Date(Date.now() + 10*60*1000),
      },
    });
    console.log(result);
    if (!result) {
      return res
        .status(401)
        .json({ success: true, message: "Internal server error" });
    }
    logSecurityEvent(user.id, "LOGIN_OTP_SENT");
    // PASSWORD AND OTP VALIDATAION
    return res
      .status(200)
      .json({
        success: true,
        message: "Otp send succseffully",
        amount: amount,
        type: type,
      });
  } catch (error) {
    console.log(error);
  }
};

exports.verifyInvestmentOtp = async (req, res) => {
  const { userId, amount, type, otp, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const asset = await prisma.asset.findFirst({
        where: { userId: userId },
      });

  if (!user ) return res.status(404).json({ error: "User not found" });
  if (!asset ) return res.status(404).json({ error: "asset not found" });

  if (user.otpExpiry < new Date()) {
    return res.status(400).json({ error: "OTP expired" });
  }

  // Compare hashed OTP
  const isValidOTP = await comparePassword(otp, user.otp);
  if (!isValidOTP) {
    logSecurityEvent(user.id, "FAILED_LOGIN_OTP");
    // Increment failed attempts
    return res.status(400).json({ error: "Invalid OTP" });
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    logSecurityEvent(user.id, "FAILED_LOGIN_ATTEMPT", { email });
    return res.status(401).json({ error: "Invalid credentials" });
  }
  
//   if (!Object.values(InvestmentType).includes(InvestmentType[type])) {
//     return res.status(400).json({ error: "Invalid investment type" });
//   }

  const investment = await prisma.investment.create({
    data: {
      userId: userId,
      amount: amount,
      type: InvestmentType.STOCKS,     // Correct way to handle enum
      createdAt: new Date(),
      
    },
  });

console.log(investment)

  await prisma.user.update({
    where: { id: userId },
    data: {
     
      investments: {
        create: {
          type: InvestmentType[type],
          amount: amount,
          createdAt: new Date(),
          createdAt: new Date(),
        },
      },

      assets:{
        create:{
            type:"USD",// e.g., "BTC", "ETH", "USD"
            balance: amount,
            updatedAt: new Date(),

        }
      }
    },
  });
  

  return res
      .status(200)
      .json({
        success: true,
        message: "Investment done",
        amount: amount,
        type: type,
      });

  } catch (error) {
    console.log(error);
  }
  
};


// exports.createAsset = async (req, res) => {
//     const userId = 5
//     const type = "USD"
//     try {
//       const user = await prisma.user.findUnique({
//         where: { id: userId },
//       });
  
//       if (!user) {
//         return res.status(404).json({ message: 'User not found' });
//       }
  
//       const asset = await prisma.asset.create({
//         data: {
//           userId,
//           type,
          
//         },
//       });
  
//       return res.status(201).json(asset);
//     } catch (error) {
//       console.error('Error creating asset:', error);
//       return res.status(500).json({ message: 'Internal server error' });
//     }
//   };
  
  
  // Example usage
 
  