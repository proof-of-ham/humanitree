# Humanitree Backend - USDC Donation Handler

A lightweight backend module that enables USDC donations to verified NGOs. This module is designed to be reusable and can be integrated into frontend applications or mobile mini-apps.

## Features

- 🌟 **Simple USDC Donations**: Fixed amount donations to verified NGO wallets
- 🔒 **Secure**: Private key management and input validation
- 🌐 **Multi-Network**: Support for Ethereum mainnet and Polygon
- 🚀 **API Ready**: RESTful endpoint for easy integration
- 📱 **Mobile Friendly**: Compatible with World App and other mini-apps
- 🛡️ **Protected**: Rate limiting and security measures included

## Quick Start

### Prerequisites

- Node.js v18+ (LTS recommended)
- npm or yarn package manager
- An Ethereum/Polygon RPC provider (Infura, Alchemy, etc.)
- A wallet for testing (with some ETH/MATIC for gas fees)

### Installation

1. **Clone and navigate to the backend directory:**
   ```bash
   cd humanitree/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the backend directory with the following variables:
   ```bash
   # Network Configuration
   RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
   
   # Wallet Configuration (⚠️ Never commit this!)
   USER_WALLET_PK=your_private_key_here
   
   # USDC Contract (Ethereum Mainnet)
   USDC_CONTRACT=0xA0b86a33E6441e28E76e5F9b2Be7f99a0bCfDc2D
   
   # Recipient (One Tree Planted via Every.org)
   RECIPIENT_WALLET=0xd9Cda69D2Adf7b4Eb2B77e35c492Bd96B86e8bA7
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # Security Settings
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX_REQUESTS=10
   CORS_ORIGINS=http://localhost:3000,http://localhost:3001
   
   # Donation Limits
   DEFAULT_DONATION_AMOUNT=5.0
   MAX_DONATION_AMOUNT=100.0
   MIN_DONATION_AMOUNT=1.0
   ```

4. **Start the server:**
   ```bash
   npm run dev  # For development with auto-reload
   # or
   npm start    # For production
   ```

## API Usage

### Donate Endpoint

**POST** `/api/donate`

Triggers a USDC donation to the configured NGO wallet.

**Request Body:**
```json
{
  "amount": "5.0"
}
```

**Response (Success):**
```json
{
  "success": true,
  "transactionHash": "0x1234567890abcdef...",
  "amount": "5.0",
  "recipient": "0xd9Cda69D2Adf7b4Eb2B77e35c492Bd96B86e8bA7",
  "network": "ethereum"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Insufficient balance",
  "message": "Not enough USDC tokens in wallet"
}
```

### Example Usage

```javascript
// Frontend integration
const donate = async (amount) => {
  const response = await fetch('/api/donate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: amount.toString() })
  });
  
  const result = await response.json();
  return result;
};

// Usage
donate(5.0).then(result => {
  if (result.success) {
    console.log('Donation successful!', result.transactionHash);
  } else {
    console.error('Donation failed:', result.error);
  }
});
```

## Network Configuration

### Ethereum Mainnet (Default)
- **RPC URL**: `https://mainnet.infura.io/v3/YOUR_PROJECT_ID`
- **USDC Contract**: `0xA0b86a33E6441e28E76e5F9b2Be7f99a0bCfDc2D`
- **Gas Fees**: Higher, but more secure

### Polygon Mainnet (Recommended for lower fees)
- **RPC URL**: `https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID`
- **USDC Contract**: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- **Gas Fees**: Much lower (fractions of cents)

### Sepolia Testnet (For testing)
- **RPC URL**: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`
- **USDC Contract**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **Gas Fees**: Free (testnet ETH)

## Security Features

- ✅ **Input Validation**: All inputs are validated and sanitized
- ✅ **Rate Limiting**: Prevents abuse with configurable limits
- ✅ **CORS Protection**: Configurable origins for frontend integration
- ✅ **Environment Variables**: Sensitive data kept secure
- ✅ **Error Handling**: Comprehensive error responses
- ✅ **Balance Validation**: Checks wallet balance before transactions

## Development

### Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with auto-reload
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Deployment

### Environment Variables for Production

Make sure to set these environment variables in your production environment:

- `RPC_URL`: Your production RPC endpoint
- `USER_WALLET_PK`: Production wallet private key (use a secure method)
- `USDC_CONTRACT`: Correct USDC contract for your network
- `RECIPIENT_WALLET`: Verified NGO wallet address
- `NODE_ENV`: Set to `production`
- `PORT`: Server port (default: 3000)

### Security Checklist

- [ ] Private keys are stored securely (not in code)
- [ ] Rate limiting is properly configured
- [ ] CORS origins are restricted to your domains
- [ ] Logging doesn't expose sensitive information
- [ ] Error messages don't leak system details
- [ ] Wallet has limited funds for security

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
- Create an issue in the repository
- Check the troubleshooting section below

## Troubleshooting

### Common Issues

**"Insufficient balance" error:**
- Ensure your wallet has enough USDC tokens
- Check that you have enough ETH/MATIC for gas fees

**Connection errors:**
- Verify your RPC_URL is correct and accessible
- Check your internet connection
- Ensure the RPC provider is not rate-limiting you

**Transaction failures:**
- Check gas limits and network congestion
- Verify the USDC contract address for your network
- Ensure the recipient wallet address is correct

**Rate limiting:**
- The API limits requests to prevent abuse
- Default is 10 requests per minute per IP
- Adjust `RATE_LIMIT_MAX_REQUESTS` if needed for your use case 