const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getDashboardOverview = async (req, res) => {
    try {
      const userId = req.user.id;
      console.log(`Fetching dashboard data for user ID: ${userId}`);
      
      // Get user balance
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true }
      });
      console.log('User balance fetched:', user.balance);
  
      // Calculate net transactions (last 30 days)
      const transactions = await prisma.transaction.findMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ],
          createdAt: {
            gte: new Date(new Date() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      });
      console.log('Transactions fetched:', transactions);
  
      const netTransactions = transactions.reduce((acc, t) => {
        return t.senderId === userId ? acc - t.amount : acc + t.amount;
      }, 0);
      console.log('Net transactions calculated:', netTransactions);
  
      // Calculate total assets
      const assets = await prisma.asset.findMany({
        where: { userId }
      });
      console.log('Assets fetched:', assets);
  
      const totalAssets = assets.reduce((acc, a) => acc + a.balance, 0);
      console.log('Total assets calculated:', totalAssets);
  
      // Calculate total investments
      const investments = await prisma.investment.findMany({
        where: { userId }
      });
      console.log('Investments fetched:', investments);
  
      const totalInvestments = investments.reduce((acc, i) => acc + i.amount, 0);
      console.log('Total investments calculated:', totalInvestments);
  
      res.json({
        totalBalance: user.balance,
        netTransactions,
        totalAssets,
        totalInvestments
      });
      console.log('Dashboard data sent to client');
  
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ error: 'Failed to load dashboard data' });
    }
};