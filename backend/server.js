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

// Initialize donation handler on startup
initializeDonationHandler();

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
    message: 'Welcome to the USDC Donation Backend API',
    endpoints: {
      health: '/health',
      donate: '/api/donate (POST)'
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

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: ['GET /', 'GET /health', 'POST /api/donate']
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