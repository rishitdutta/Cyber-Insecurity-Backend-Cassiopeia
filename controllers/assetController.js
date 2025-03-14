// controllers/assetController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const assetController = {
  // Get assets for the logged-in user
  getMyAssets: async (req, res) => {
    try {
      const assets = await prisma.asset.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
      });
      
      // Calculate total balance for each currency
      const totals = {};
      assets.forEach(asset => {
        if (!totals[asset.currency]) {
          totals[asset.currency] = 0;
        }
        totals[asset.currency] += asset.balance;
      });
      
      res.status(200).json({
        assets,
        summary: {
          totalAssets: assets.length,
          balances: totals
        }
      });
    } catch (error) {
      console.error('Error fetching user assets:', error);
      res.status(500).json({ error: 'Failed to fetch assets' });
    }
  },

  // Get all assets (admin only)
  getAllAssets: async (req, res) => {
    try {
      const { page = 1, limit = 10, userId, type, currency, sortBy = 'createdAt', order = 'desc' } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Build where conditions
      const where = {};
      
      if (userId) where.userId = parseInt(userId);
      if (type) where.type = type;
      if (currency) where.currency = currency;
      
      // Get total count for pagination
      const totalAssets = await prisma.asset.count({ where });
      
      // Get assets with pagination and sorting
      const assets = await prisma.asset.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: {
          [sortBy]: order.toLowerCase()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      // Log admin action
      await prisma.securityLog.create({
        data: {
          userId: req.user.id,
          eventType: "SUSPICIOUS_ACTIVITY",
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: {
            action: "ADMIN_VIEW_ALL_ASSETS",
            filters: { userId, type, currency }
          }
        }
      });
      
      res.status(200).json({
        data: assets,
        pagination: {
          total: totalAssets,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalAssets / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching all assets:', error);
      res.status(500).json({ error: 'Failed to fetch assets' });
    }
  },

  // Get asset by ID (admin only)
  getAssetById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const asset = await prisma.asset.findUnique({
        where: { id: parseInt(id) },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isVerified: true,
              lastLoginAt: true
            }
          }
        }
      });
      
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      
      // Log admin access
      await prisma.securityLog.create({
        data: {
          userId: req.user.id,
          eventType: "SUSPICIOUS_ACTIVITY",
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: {
            action: "ADMIN_VIEW_ASSET_DETAIL",
            assetId: parseInt(id),
            assetOwner: asset.userId
          }
        }
      });
      
      // Get related transactions
      const transactions = await prisma.transaction.findMany({
        where: {
          OR: [
            { senderId: asset.userId, type: "DEBIT" },
            { receiverId: asset.userId, type: "CREDIT" }
          ]
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          type: true,
          status: true,
          createdAt: true
        }
      });
      
      res.status(200).json({
        ...asset,
        recentTransactions: transactions
      });
    } catch (error) {
      console.error('Error fetching asset by ID:', error);
      res.status(500).json({ error: 'Failed to fetch asset details' });
    }
  },

  // Create new asset
  createAsset: async (req, res) => {
    try {
      const { type, balance = 0.0, currency = "USD" } = req.body;
      
      if (!type) {
        return res.status(400).json({ error: 'Asset type is required' });
      }
      
      const newAsset = await prisma.asset.create({
        data: {
          userId: req.user.id,
          type,
          balance: parseFloat(balance),
          currency
        }
      });
      
      // Log asset creation
      await prisma.securityLog.create({
        data: {
          userId: req.user.id,
          eventType: "ASSET_TRANSFER",
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: {
            action: "ASSET_CREATION",
            assetId: newAsset.id,
            assetType: type,
            initialBalance: balance
          }
        }
      });
      
      res.status(201).json(newAsset);
    } catch (error) {
      console.error('Error creating asset:', error);
      res.status(500).json({ error: 'Failed to create asset' });
    }
  },

  // Update asset
  updateAsset: async (req, res) => {
    try {
      const { id } = req.params;
      const { balance, currency } = req.body;
      
      // Check if the asset exists and belongs to the user
      const existingAsset = await prisma.asset.findFirst({
        where: { 
          id: parseInt(id),
          userId: req.user.id
        }
      });
      
      if (!existingAsset) {
        return res.status(404).json({ error: 'Asset not found or you do not have permission to update it' });
      }
      
      const updatedAsset = await prisma.asset.update({
        where: { id: parseInt(id) },
        data: {
          ...(balance !== undefined && { balance: parseFloat(balance) }),
          ...(currency && { currency }),
          updatedAt: new Date()
        }
      });
      
      // Log asset update
      await prisma.securityLog.create({
        data: {
          userId: req.user.id,
          eventType: "ASSET_TRANSFER",
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: {
            action: "ASSET_UPDATE",
            assetId: parseInt(id),
            previousBalance: existingAsset.balance,
            newBalance: updatedAsset.balance,
            previousCurrency: existingAsset.currency,
            newCurrency: updatedAsset.currency
          }
        }
      });
      
      res.status(200).json(updatedAsset);
    } catch (error) {
      console.error('Error updating asset:', error);
      res.status(500).json({ error: 'Failed to update asset' });
    }
  },

  // Delete asset (admin only)
  deleteAsset: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get asset details before deletion
      const assetToDelete = await prisma.asset.findUnique({
        where: { id: parseInt(id) },
        include: {
          user: {
            select: {
              email: true
            }
          }
        }
      });
      
      if (!assetToDelete) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      
      // Delete the asset
      await prisma.asset.delete({
        where: { id: parseInt(id) }
      });
      
      // Log asset deletion
      await prisma.securityLog.create({
        data: {
          userId: req.user.id,
          eventType: "ASSET_TRANSFER",
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: {
            action: "ADMIN_ASSET_DELETION",
            assetId: parseInt(id),
            assetType: assetToDelete.type,
            assetBalance: assetToDelete.balance,
            assetOwner: assetToDelete.userId,
            ownerEmail: assetToDelete.user.email
          }
        }
      });
      
      res.status(200).json({ message: 'Asset deleted successfully' });
    } catch (error) {
      console.error('Error deleting asset:', error);
      res.status(500).json({ error: 'Failed to delete asset' });
    }
  }
};

module.exports = assetController;