#!/usr/bin/env node

/**
 * USDC Donation Backend Server
 * Express.js server for handling USDC donations to verified NGOs
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { validateDonationRequest, handleValidationErrors, sanitizeDonationRequest } = require('./middleware/validation');
const { createDonationHandler } = require('./donateUSDC');
const { swapService, getSwapQuote, swapWLDtoUSDC, getPoolInfo, getTransactionStatus, estimateSwapGas } = require('./swapService');
const TreePurchaseService = require('./treePurchaseService');

// Create Express application
const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // Define allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',  // Vite dev server
      'http://localhost:5174',  // Vite dev server (alternate)
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    ];
    
    // Add custom origins from environment variables
    const customOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) : [];
    const allAllowedOrigins = [...allowedOrigins, ...customOrigins];
    
    if (allAllowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS warning: Origin ${origin} not allowed`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Rate limiting configuration
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req, res) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/health';
  }
});

// Stricter rate limiting for donation endpoint
const donationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 donation requests per hour
  message: {
    error: 'Too many donation requests',
    message: 'Too many donation requests from this IP. Please wait before making another donation.',
    retryAfter: 60 * 60 // 1 hour in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  keyGenerator: (req) => {
    // Use IP address as the key
    return req.ip;
  }
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize donation handler
let donationHandler = null;
const initializeDonationHandler = async () => {
  try {
    donationHandler = await createDonationHandler();
    console.log('✅ Donation handler initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize donation handler:', error.message);
    console.error('   Please check your environment variables and network configuration');
  }
};

// Initialize tree purchase service
let treePurchaseService = null;
const initializeTreePurchaseService = async () => {
  try {
    treePurchaseService = new TreePurchaseService();
    console.log('✅ Tree purchase service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize tree purchase service:', error.message);
  }
};

// Initialize services on startup
initializeDonationHandler();
initializeTreePurchaseService();

// Helper function to execute donations
const executeDonation = async (amount, recipient, network = 'polygon') => {
  if (!donationHandler) {
    throw new Error('Donation handler not initialized');
  }

  console.log(`🔄 Processing donation: ${amount} USDC to ${recipient} on ${network}`);
  
  // Execute the donation (donateUSDC module handles errors internally)
  const result = await donationHandler.donate(recipient, amount.toString());
  
  if (result.success) {
    console.log(`✅ Donation successful: ${result.transactionHash}`);
  } else {
    console.error(`❌ Donation failed: ${result.error}`);
  }
  
  return result;
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'USDC Donation Backend is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '1.0.0',
    services: {
      donationHandler: donationHandler ? 'Connected' : 'Not initialized'
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the Humanitree Backend API',
    endpoints: {
      health: '/health',
      donate: '/api/donate (POST)',
      swap: {
        poolInfo: '/api/swap/pool-info (GET)',
        quote: '/api/swap/quote?amount=10&slippage=150 (GET)',
        execute: '/api/swap/execute (POST)',
        status: '/api/swap/status/:txHash (GET)',
        gasEstimate: '/api/swap/gas-estimate?amount=10&userAddress=0x... (GET)'
      },
      trees: {
        impact: '/api/trees/impact?amount=10 (GET)',
        donate: '/api/trees/donate (POST)',
        history: '/api/trees/history/:address (GET)',
        receipt: '/api/trees/receipt/:id (GET)',
        stats: '/api/trees/stats (GET)'
      }
    },
    documentation: 'See README.md for full API documentation'
  });
});

// Main donation endpoint
app.post('/api/donate', 
  donationLimiter,                    // Apply donation-specific rate limiting
  validateDonationRequest,            // Validate request data
  handleValidationErrors,             // Handle validation errors
  sanitizeDonationRequest,            // Sanitize and normalize data
  async (req, res) => {
    const { amount, recipient, network, message, donor } = req.body;
    
      try {
    // Execute the donation
    const result = await executeDonation(amount, recipient, network);
    
    // Check if donation was successful
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        errorCode: result.errorCode,
        message: 'Donation failed',
        timestamp: new Date().toISOString(),
        // Only include detailed error in development
        ...(NODE_ENV === 'development' && { details: result.error })
      });
    }
    
    // Successful donation response
    res.status(200).json({
      success: true,
      message: 'Donation processed successfully',
      transaction: {
        hash: result.transactionHash,  // Fixed: was result.hash
        amount: amount,
        recipient: recipient,
        network: network || 'polygon',
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed,
        gasPrice: result.effectiveGasPrice,  // Fixed: was result.gasPrice
        timestamp: new Date().toISOString()
      },
      donor: donor || null
    });
      
    } catch (error) {
      console.error('❌ Donation endpoint error:', error);
      
      // Determine error type and send appropriate response
      let statusCode = 500;
      let errorMessage = 'Internal server error';
      
      if (error.code === 'INSUFFICIENT_FUNDS' || error.message.includes('insufficient funds')) {
        statusCode = 400;
        errorMessage = 'Insufficient funds for donation or gas fees';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('network')) {
        statusCode = 503;
        errorMessage = 'Network connection error. Please try again later.';
      } else if (error.code === 'INVALID_RECIPIENT' || error.message.includes('invalid recipient')) {
        statusCode = 400;
        errorMessage = 'Invalid recipient address';
      } else if (error.message.includes('handler not initialized')) {
        statusCode = 503;
        errorMessage = 'Service temporarily unavailable. Please try again later.';
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: 'Donation could not be processed',
        timestamp: new Date().toISOString(),
        // Only include detailed error in development
        ...(NODE_ENV === 'development' && { details: error.message })
      });
    }
  }
);

// Test validation endpoint (for development/testing)
app.post('/api/test-validation', 
  validateDonationRequest, 
  handleValidationErrors, 
  sanitizeDonationRequest,
  (req, res) => {
    res.status(200).json({
      message: 'Validation passed successfully',
      sanitizedData: req.body,
      timestamp: new Date().toISOString()
    });
  }
);

// === SWAP ENDPOINTS ===

// Get pool information for SimpleDEX
app.get('/api/swap/pool-info', async (req, res) => {
  try {
    console.log('📊 Getting pool information...');
    const poolInfo = await getPoolInfo();
    
    res.status(200).json({
      success: true,
      data: poolInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Pool info error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not fetch pool information',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get swap quote for WLD to USDC
app.get('/api/swap/quote', async (req, res) => {
  try {
    const { amount, slippage } = req.query;
    
    // Validate parameters
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount parameter',
        message: 'Amount must be a positive number',
        timestamp: new Date().toISOString()
      });
    }
    
    const wldAmount = parseFloat(amount);
    const slippageBasisPoints = slippage ? parseInt(slippage) : 150; // Default 1.5%
    
    // Validate slippage
    if (slippageBasisPoints < 10 || slippageBasisPoints > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid slippage parameter',
        message: 'Slippage must be between 10 (0.1%) and 5000 (50%) basis points',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`💱 Getting quote for ${wldAmount} WLD with ${slippageBasisPoints / 100}% slippage...`);
    const quote = await getSwapQuote(wldAmount, slippageBasisPoints);
    
    res.status(200).json({
      success: true,
      data: quote,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Quote error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not generate swap quote',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Execute WLD to USDC swap
app.post('/api/swap/execute', async (req, res) => {
  try {
    const { amount, slippage, privateKey } = req.body;
    
    // Validate parameters
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount parameter',
        message: 'Amount must be a positive number',
        timestamp: new Date().toISOString()
      });
    }
    
    if (!privateKey || typeof privateKey !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing private key',
        message: 'Private key is required to execute swap',
        timestamp: new Date().toISOString()
      });
    }
    
    const wldAmount = parseFloat(amount);
    const slippageBasisPoints = slippage ? parseInt(slippage) : 150; // Default 1.5%
    
    // Validate slippage
    if (slippageBasisPoints < 10 || slippageBasisPoints > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid slippage parameter',
        message: 'Slippage must be between 10 (0.1%) and 5000 (50%) basis points',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`🔄 Executing swap: ${wldAmount} WLD → USDC with ${slippageBasisPoints / 100}% slippage...`);
    const result = await swapWLDtoUSDC(wldAmount, privateKey, slippageBasisPoints);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result,
        message: 'Swap executed successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Swap execution failed',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ Swap execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not execute swap',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get transaction status
app.get('/api/swap/status/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    
    // Validate transaction hash
    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction hash',
        message: 'Transaction hash must be a valid 64-character hex string starting with 0x',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`🔍 Checking transaction status: ${txHash}`);
    const status = await getTransactionStatus(txHash);
    
    res.status(200).json({
      success: true,
      data: status,
      transactionHash: txHash,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not check transaction status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Estimate gas for a swap
app.get('/api/swap/gas-estimate', async (req, res) => {
  try {
    const { amount, userAddress } = req.query;
    
    // Validate parameters
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount parameter',
        message: 'Amount must be a positive number',
        timestamp: new Date().toISOString()
      });
    }
    
    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user address',
        message: 'User address must be a valid Ethereum address',
        timestamp: new Date().toISOString()
      });
    }
    
    const wldAmount = parseFloat(amount);
    
    console.log(`⛽ Estimating gas for ${wldAmount} WLD swap from ${userAddress}...`);
    const gasEstimate = await estimateSwapGas(wldAmount, userAddress);
    
    res.status(200).json({
      success: true,
      data: gasEstimate,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Gas estimation error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not estimate gas',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== TREE PURCHASE ENDPOINTS ====================

// Calculate environmental impact preview
app.get('/api/trees/impact', async (req, res) => {
  try {
    const { amount } = req.query;
    
    // Validate amount parameter
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount parameter',
        message: 'Amount must be a positive number',
        timestamp: new Date().toISOString()
      });
    }
    
    const usdcAmount = parseFloat(amount);
    const impact = treePurchaseService.calculateImpact(usdcAmount);
    
    res.status(200).json({
      success: true,
      data: impact,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Impact calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not calculate impact',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Execute tree purchase donation
app.post('/api/trees/donate', async (req, res) => {
  try {
    const { amount, donorAddress, privateKey, message } = req.body;
    
    // Validate required parameters
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount parameter',
        message: 'Amount must be a positive number',
        timestamp: new Date().toISOString()
      });
    }
    
    if (!donorAddress || !/^0x[a-fA-F0-9]{40}$/.test(donorAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid donor address',
        message: 'Donor address must be a valid Ethereum address',
        timestamp: new Date().toISOString()
      });
    }
    
    if (!privateKey || typeof privateKey !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing private key',
        message: 'Private key is required to execute donation',
        timestamp: new Date().toISOString()
      });
    }
    
    const usdcAmount = parseFloat(amount);
    
    console.log(`🌳 Processing tree donation: ${usdcAmount} USDC from ${donorAddress}`);
    
    // Execute the donation
    const donationRecord = await treePurchaseService.executeDonation(donorAddress, usdcAmount, privateKey);
    
    // Generate receipt
    const receipt = treePurchaseService.generateReceipt(donationRecord);
    
    res.status(200).json({
      success: true,
      data: {
        donation: donationRecord,
        receipt: receipt
      },
      message: 'Tree donation completed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Tree donation error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not complete tree donation',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get donation history for a specific address
app.get('/api/trees/history/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate address
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address parameter',
        message: 'Address must be a valid Ethereum address',
        timestamp: new Date().toISOString()
      });
    }
    
    const history = treePurchaseService.getDonationHistory(address);
    
    res.status(200).json({
      success: true,
      data: {
        address: address,
        donations: history,
        totalDonations: history.length,
        totalAmount: history.reduce((sum, donation) => sum + donation.amount, 0),
        totalTrees: history.reduce((sum, donation) => sum + donation.impact.treesPlanted, 0)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ History retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not retrieve donation history',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get donation receipt by ID
app.get('/api/trees/receipt/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid receipt ID',
        message: 'Receipt ID must be a valid string',
        timestamp: new Date().toISOString()
      });
    }
    
    const donationRecord = treePurchaseService.getDonationById(id);
    
    if (!donationRecord) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found',
        message: `No donation found with ID: ${id}`,
        timestamp: new Date().toISOString()
      });
    }
    
    const receipt = treePurchaseService.generateReceipt(donationRecord);
    
    res.status(200).json({
      success: true,
      data: receipt,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Receipt retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not retrieve receipt',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get overall impact statistics
app.get('/api/trees/stats', async (req, res) => {
  try {
    const stats = treePurchaseService.getTotalImpact();
    const recentDonations = treePurchaseService.getRecentDonations();
    
    res.status(200).json({
      success: true,
      data: {
        globalStats: stats,
        recentDonations: recentDonations,
        foundationInfo: {
          name: "Rainforest Foundation US",
          website: "https://rainforestfoundation.org",
          mission: "Protecting rainforests and Indigenous rights since 1989",
          cryptoTotal: "$1,613,250 donated in crypto to date",
          realAddress: "0x98f5A404991Cc74590564cbECA88c8d8B76D6407",
          testnetAddress: "0x1234567890123456789012345678901234567890"
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Stats retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not retrieve statistics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /', 
      'GET /health', 
      'POST /api/donate',
      'GET /api/swap/pool-info',
      'GET /api/swap/quote',
      'POST /api/swap/execute',
      'GET /api/swap/status/:txHash',
      'GET /api/swap/gas-estimate',
      'GET /api/trees/impact',
      'POST /api/trees/donate',
      'GET /api/trees/history/:address',
      'GET /api/trees/receipt/:id',
      'GET /api/trees/stats'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', error);
  
  res.status(error.status || 500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 USDC Donation Backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 Documentation: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;
module.exports.donationLimiter = donationLimiter; 