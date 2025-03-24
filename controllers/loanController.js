const { PrismaClient, LoanStatus } = require("@prisma/client");
const prisma = new PrismaClient();
const { logSecurityEvent } = require("../utils/securityLogger");

// User Operations
exports.applyLoan = async (req, res) => {
  const { amount, dueDate, accountNumber, interest } = req.body;
  const userId = req.user.id;

  try {
    // Input validation
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Valid loan amount required" 
      });
    }

    if (!dueDate || isNaN(new Date(dueDate).getTime())) {
      return res.status(400).json({ 
        success: false, 
        message: "Valid due date required" 
      });
    }

    if (!accountNumber || typeof accountNumber !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: "Valid account number required" 
      });
    }

    // Account verification
    const account = await prisma.account.findUnique({
      where: { accountNumber },
      include: { user: true }
    });

    if (!account || account.userId !== userId) {
      await logSecurityEvent(
        userId,
        "SUSPICIOUS_ACTIVITY",
        { action: "INVALID_LOAN_ACCOUNT" },
        req.ip,
        req.headers['user-agent']
      );
      return res.status(403).json({ 
        success: false, 
        message: "Account verification failed" 
      });
    }

    // Calculate values
    const parsedAmount = parseFloat(amount);
    const finalInterest = interest ? parseFloat(interest) : 5.0;
    const repaymentAmount = parsedAmount + (parsedAmount * finalInterest / 100);
    const parsedDueDate = new Date(dueDate);

    // Date validation
    if (parsedDueDate < new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: "Due date must be in the future" 
      });
    }

    // Create loan
    const loan = await prisma.loan.create({
      data: {
        userId,
        amount: parsedAmount,
        interest: finalInterest,
        dueDate: parsedDueDate,
        status: LoanStatus.PENDING,
      }
    });

    // Log security event
    await logSecurityEvent(
      userId,
      "LOAN_APPLICATION",
      { 
        loanId: loan.id,
        amount: parsedAmount,
        interest: finalInterest,
        repaymentAmount,
        accountNumber
      },
      req.ip,
      req.headers['user-agent']
    );

    return res.status(201).json({
      success: true,
      message: "Loan application submitted",
      data: {
        ...loan,
        repaymentAmount,
        accountDetails: {
          accountNumber,
          currentBalance: account.balance
        }
      }
    });

  } catch (error) {
    console.error("[Loan] Application error:", error);
    await logSecurityEvent(
      userId,
      "SUSPICIOUS_ACTIVITY",
      { action: "LOAN_APPLICATION_FAILED", error: error.message },
      req.ip,
      req.headers['user-agent']
    );
    return res.status(500).json({ 
      success: false, 
      message: "Loan processing failed" 
    });
  }
};

exports.getUserLoans = async (req, res) => {
  const userId = req.user.id;
  const { status } = req.query;

  try {
    const whereClause = { userId };
    if (status && Object.values(LoanStatus).includes(status)) {
      whereClause.status = status;
    }

    const loans = await prisma.loan.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" }
    });

    return res.status(200).json({
      success: true,
      data: loans.map(loan => ({
        ...loan,
        repaymentAmount: loan.amount + (loan.amount * loan.interest / 100)
      })),
      count: loans.length
    });

  } catch (error) {
    console.error("[Loan] Fetch error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to retrieve loans" 
    });
  }
};

// Admin Operations
exports.getAllLoans = async (req, res) => {
  const { status } = req.query;
  const adminId = req.user.id;

  try {
    const whereClause = {};
    if (status && Object.values(LoanStatus).includes(status)) {
      whereClause.status = status;
    }

    const loans = await prisma.loan.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Log admin access
    await logSecurityEvent(
      adminId,
      "ADMIN_ACTION",
      { action: "VIEW_ALL_LOANS", count: loans.length },
      req.ip,
      req.headers['user-agent']
    );

    return res.status(200).json({
      success: true,
      data: loans.map(loan => ({
        ...loan,
        repaymentAmount: loan.amount + (loan.amount * loan.interest / 100)
      })),
      count: loans.length
    });

  } catch (error) {
    console.error("[Admin] Loan fetch error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to retrieve loans" 
    });
  }
};

exports.processLoanApplication = async (req, res) => {
  const { loanId } = req.params;
  const { action, accountNumber, reason } = req.body;
  const adminId = req.user.id;

  try {
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid action type" 
      });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: Number(loanId) },
      include: { user: true }
    });

    if (!loan) {
      return res.status(404).json({ 
        success: false, 
        message: "Loan not found" 
      });
    }

    if (loan.status !== LoanStatus.PENDING) {
      return res.status(400).json({ 
        success: false, 
        message: `Loan already ${loan.status.toLowerCase()}` 
      });
    }

    let updatePromise;

    if (action === 'approve') {
      if (!accountNumber) {
        return res.status(400).json({ 
          success: false, 
          message: "Account number required for approval" 
        });
      }

      const account = await prisma.account.findUnique({
        where: { accountNumber },
        include: { user: true }
      });

      if (!account || account.userId !== loan.userId) {
        await logSecurityEvent(
          adminId,
          "SUSPICIOUS_ACTIVITY",
          { action: "INVALID_LOAN_APPROVAL_ACCOUNT" },
          req.ip,
          req.headers['user-agent']
        );
        return res.status(400).json({ 
          success: false, 
          message: "Invalid recipient account" 
        });
      }

      updatePromise = prisma.$transaction([
        prisma.account.update({
          where: { id: account.id },
          data: { balance: { increment: loan.amount } }
        }),
        prisma.loan.update({
          where: { id: loan.id },
          data: { status: LoanStatus.APPROVED }
        })
      ]);
    } else {
      updatePromise = prisma.loan.update({
        where: { id: loan.id },
        data: { status: LoanStatus.REJECTED }
      });
    }

    await updatePromise;

    await logSecurityEvent(
      adminId,
      action === 'approve' ? "LOAN_APPROVAL" : "LOAN_REJECTION",
      { 
        loanId: loan.id,
        userId: loan.userId,
        accountNumber,
        reason
      },
      req.ip,
      req.headers['user-agent']
    );

    return res.status(200).json({
      success: true,
      message: `Loan ${action}ed successfully`,
      data: {
        loanId: loan.id,
        newStatus: action.toUpperCase()
      }
    });

  } catch (error) {
    console.error("[Loan] Processing error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Loan processing failed" 
    });
  }
};

// Shared Operations
exports.getLoanDetails = async (req, res) => {
  const { loanId } = req.params;

  try {
    const loan = await prisma.loan.findUnique({
      where: { id: Number(loanId) },
      include: { user: true }
    });

    if (!loan) {
      return res.status(404).json({ 
        success: false, 
        message: "Loan not found" 
      });
    }

    const repaymentAmount = loan.amount + (loan.amount * loan.interest / 100);
    const daysRemaining = Math.ceil(
      (loan.dueDate - new Date()) / (1000 * 60 * 60 * 24)
    );

    return res.status(200).json({
      success: true,
      data: {
        ...loan,
        repaymentAmount,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0
      }
    });

  } catch (error) {
    console.error("[Loan] Detail fetch error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to retrieve loan details" 
    });
  }
};