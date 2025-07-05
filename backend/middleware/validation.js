const { body, validationResult } = require('express-validator');
const { ethers } = require('ethers');

/**
 * Validation middleware for donation requests
 */
const validateDonationRequest = [
  // Validate amount
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number with minimum value of 0.01')
    .custom((value) => {
      // Check if amount has more than 6 decimal places (USDC has 6 decimals)
      if (value !== undefined && value !== null) {
        const parts = value.toString().split('.');
        if (parts[1] && parts[1].length > 6) {
          throw new Error('Amount cannot have more than 6 decimal places');
        }
      }
      return true;
    }),

  // Validate recipient address
  body('recipient')
    .notEmpty()
    .withMessage('Recipient address is required')
    .custom((value) => {
      if (!ethers.isAddress(value)) {
        throw new Error('Invalid Ethereum address format');
      }
      return true;
    }),

  // Optional: Validate message (if provided)
  body('message')
    .optional()
    .isString()
    .withMessage('Message must be a string')
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters')
    .trim(),

  // Optional: Validate network (if provided)
  body('network')
    .optional()
    .isIn(['ethereum', 'polygon', 'sepolia', 'amoy'])
    .withMessage('Network must be one of: ethereum, polygon, sepolia, amoy'),

  // Optional: Validate donor information (if provided)
  body('donor')
    .optional()
    .isObject()
    .withMessage('Donor information must be an object'),

  body('donor.name')
    .optional()
    .isString()
    .withMessage('Donor name must be a string')
    .isLength({ max: 100 })
    .withMessage('Donor name cannot exceed 100 characters')
    .trim(),

  body('donor.email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('donor.anonymous')
    .optional()
    .isBoolean()
    .withMessage('Anonymous flag must be a boolean')
];

/**
 * Validation result handler middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your request data and try again',
      details: errorMessages,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Sanitize and normalize donation request data
 */
const sanitizeDonationRequest = (req, res, next) => {
  const { amount, recipient, message, network, donor } = req.body;
  
  // Sanitize the request data
  req.body = {
    amount: parseFloat(amount),
    recipient: recipient.toLowerCase(), // Normalize address to lowercase
    message: message ? message.trim() : undefined,
    network: network ? network.toLowerCase() : 'polygon', // Default to polygon
    donor: donor ? {
      name: donor.name ? donor.name.trim() : undefined,
      email: donor.email ? donor.email.toLowerCase() : undefined,
      anonymous: donor.anonymous !== undefined ? Boolean(donor.anonymous) : false
    } : undefined
  };

  next();
};

module.exports = {
  validateDonationRequest,
  handleValidationErrors,
  sanitizeDonationRequest
}; 