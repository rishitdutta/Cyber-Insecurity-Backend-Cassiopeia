const { PrismaClient, InvestmentType } = require("@prisma/client");
const prisma = new PrismaClient();
const { logSecurityEvent } = require("../utils/securityLogger");
const { investmentSchema } = require("../middleware/investmentValidator");

// Create Investment
exports.createInvestment = async (req, res) => {
  const { amount, type, accountNumber } = req.body;
  const userId = req.user.id;

  try {
    console.log("[Investment] Starting investment creation for user:", userId);

    // Validate amount
    const { error } = investmentSchema.validate({ amount });
    if (error) {
      console.log("[Investment] Validation error:", error.message);
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    // Find the selected account
    console.log("[Investment] Fetching account:", accountNumber);
    const account = await prisma.account.findUnique({
      where: { accountNumber },
      include: { user: true },
    });

    if (!account) {
      console.log("[Investment] Account not found:", accountNumber);
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    // Ensure the account belongs to the user
    if (account.userId !== userId) {
      console.log("[Investment] Unauthorized access to account:", accountNumber);
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    // Check if the account has sufficient balance
    console.log("[Investment] Checking balance. Account balance:", account.balance, "Requested amount:", amount);
    if (account.balance < amount) {
      console.log("[Investment] Insufficient balance");
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    // Validate investment type
    if (!Object.values(InvestmentType).includes(type)) {
      console.log("[Investment] Invalid investment type:", type);
      return res.status(400).json({ success: false, message: "Invalid investment type" });
    }

    // Deduct amount from the account
    console.log("[Investment] Deducting from account balance...");
    await prisma.account.update({
      where: { id: account.id },
      data: { balance: account.balance - amount },
    });

    // Create the investment
    console.log("[Investment] Creating investment record...");
    const investment = await prisma.investment.create({
      data: {
        userId: userId,
        amount: amount,
        type: type,
        status: "ACTIVE",
      },
    });

    // Log security event
    await logSecurityEvent(userId, "ASSET_TRANSFER", {
      action: "INVESTMENT_CREATED",
      investmentId: investment.id,
      accountNumber,
      amount,
      type,
    }, req.ip, req.headers['user-agent']);

    console.log("[Investment] Successfully created investment:", investment.id);
    return res.status(201).json({
      success: true,
      message: "Investment created successfully",
      investment,
    });

  } catch (error) {
    console.error("[Investment] Error:", error);
    await logSecurityEvent(userId, "SUSPICIOUS_ACTIVITY", {
      action: "INVESTMENT_CREATION_FAILED",
      error: error.message,
    }, req.ip, req.headers['user-agent']);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Fetch Investments
exports.getInvestments = async (req, res) => {
  const userId = req.user.id;

  try {
    console.log("[Investment] Fetching investments for user:", userId);

    // Fetch investments for the user
    const investments = await prisma.investment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }, // Sort by creation date (newest first)
    });

    console.log("[Investment] Successfully fetched investments:", investments.length);
    return res.status(200).json({
      success: true,
      data: investments,
    });

  } catch (error) {
    console.error("[Investment] Error fetching investments:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch investments",
      error: error.message,
    });
  }
};