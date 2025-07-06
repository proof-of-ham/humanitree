/**
 * USDC Donation Handler Module
 * 
 * A comprehensive module for handling USDC token donations to NGOs
 * Supports multiple networks (Ethereum, Polygon) with security features
 */

const { ethers } = require('ethers');
require('dotenv').config();

// USDC Token ABI (minimal interface needed for transfers)
const USDC_ABI = [
  // balanceOf
  "function balanceOf(address owner) view returns (uint256)",
  // transfer
  "function transfer(address to, uint256 amount) returns (bool)",
  // decimals
  "function decimals() view returns (uint8)",
  // symbol
  "function symbol() view returns (string)",
  // name
  "function name() view returns (string)"
];

// Network configurations
const NETWORK_CONFIG = {
  ethereum: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    usdcContract: '0xA0b86a33E6441e28E76e5F9b2Be7f99a0bCfDc2D',
    rpcUrls: ['https://mainnet.infura.io/v3/', 'https://eth-mainnet.alchemyapi.io/v2/']
  },
  polygon: {
    name: 'Polygon Mainnet',
    chainId: 137,
    usdcContract: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    rpcUrls: ['https://polygon-mainnet.infura.io/v3/', 'https://polygon-mainnet.g.alchemy.com/v2/']
  },
  sepolia: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    usdcContract: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    rpcUrls: ['https://sepolia.infura.io/v3/']
  }
};

class DonationHandler {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.usdcContract = null;
    this.network = null;
    this.initialized = false;
  }

  /**
   * Initialize the donation handler with network connection
   * @param {string} rpcUrl - RPC endpoint URL
   * @param {string} privateKey - Wallet private key
   * @param {string} usdcContractAddress - USDC contract address
   * @returns {Promise<void>}
   */
  async initialize(rpcUrl, privateKey, usdcContractAddress) {
    try {
      // Validate inputs
      if (!rpcUrl || !privateKey || !usdcContractAddress) {
        throw new Error('Missing required parameters: rpcUrl, privateKey, or usdcContractAddress');
      }

      // Create provider
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Test network connectivity
      await this.testConnection();
      
      // Create signer
      this.signer = new ethers.Wallet(privateKey, this.provider);
      
      // Create USDC contract instance
      this.usdcContract = new ethers.Contract(usdcContractAddress, USDC_ABI, this.signer);
      
      // Get network info
      const network = await this.provider.getNetwork();
      this.network = {
        name: network.name,
        chainId: Number(network.chainId)
      };
      
      this.initialized = true;
      
      console.log(`✅ Donation handler initialized on ${this.network.name} (Chain ID: ${this.network.chainId})`);
      
    } catch (error) {
      console.error('❌ Failed to initialize donation handler:', error.message);
      throw new Error(`Initialization failed: ${error.message}`);
    }
  }

  /**
   * Test network connectivity
   * @returns {Promise<void>}
   */
  async testConnection() {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      console.log(`🔗 Connected to network, latest block: ${blockNumber}`);
    } catch (error) {
      throw new Error(`Network connection failed: ${error.message}`);
    }
  }

  /**
   * Get wallet balance for USDC
   * @returns {Promise<string>} Balance in USDC (formatted)
   */
  async getBalance() {
    this.validateInitialization();
    
    try {
      const balance = await this.usdcContract.balanceOf(this.signer.address);
      const decimals = await this.usdcContract.decimals();
      const formattedBalance = ethers.formatUnits(balance, decimals);
      
      return formattedBalance;
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Get wallet ETH balance for gas fees
   * @returns {Promise<string>} Balance in ETH (formatted)
   */
  async getEthBalance() {
    this.validateInitialization();
    
    try {
      const balance = await this.provider.getBalance(this.signer.address);
      return ethers.formatEther(balance);
    } catch (error) {
      throw new Error(`Failed to get ETH balance: ${error.message}`);
    }
  }

  /**
   * Estimate gas for a USDC transfer
   * @param {string} recipient - Recipient wallet address
   * @param {string} amount - Amount to transfer (in USDC)
   * @returns {Promise<object>} Gas estimation details
   */
  async estimateGas(recipient, amount) {
    this.validateInitialization();
    
    try {
      const decimals = await this.usdcContract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);
      
      // Estimate gas limit
      const gasLimit = await this.usdcContract.transfer.estimateGas(recipient, amountWei);
      
      // Get current gas price
      const feeData = await this.provider.getFeeData();
      
      // Calculate total cost
      const totalCost = gasLimit * feeData.gasPrice;
      
      return {
        gasLimit: gasLimit.toString(),
        gasPrice: ethers.formatUnits(feeData.gasPrice, 'gwei'),
        totalCostEth: ethers.formatEther(totalCost),
        maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : null,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : null
      };
    } catch (error) {
      throw new Error(`Gas estimation failed: ${error.message}`);
    }
  }

  /**
   * Execute USDC donation
   * @param {string} recipient - Recipient wallet address
   * @param {string} amount - Amount to donate (in USDC)
   * @returns {Promise<object>} Transaction result
   */
  async donate(recipient, amount) {
    this.validateInitialization();
    
    try {
      // Validate inputs
      if (!ethers.isAddress(recipient)) {
        throw new Error('Invalid recipient address');
      }
      
      if (isNaN(amount) || parseFloat(amount) <= 0) {
        throw new Error('Invalid amount');
      }
      
      // Check balance
      const balance = await this.getBalance();
      if (parseFloat(balance) < parseFloat(amount)) {
        throw new Error(`Insufficient USDC balance. Have: ${balance}, Need: ${amount}`);
      }
      
      // Check ETH balance for gas
      const ethBalance = await this.getEthBalance();
      const gasEstimate = await this.estimateGas(recipient, amount);
      
      if (parseFloat(ethBalance) < parseFloat(gasEstimate.totalCostEth)) {
        throw new Error(`Insufficient ETH for gas fees. Have: ${ethBalance}, Need: ${gasEstimate.totalCostEth}`);
      }
      
      // Prepare transaction
      const decimals = await this.usdcContract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);
      
      console.log(`🚀 Initiating donation: ${amount} USDC to ${recipient}`);
      console.log(`💰 Gas estimate: ${gasEstimate.gasPrice} gwei (${gasEstimate.totalCostEth} ETH)`);
      
      // Execute transaction
      const tx = await this.usdcContract.transfer(recipient, amountWei);
      
      console.log(`📝 Transaction submitted: ${tx.hash}`);
      console.log(`⏳ Waiting for confirmation...`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice ? ethers.formatUnits(receipt.effectiveGasPrice, 'gwei') : null,
        amount: amount,
        recipient: recipient,
        network: this.network.name,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Donation failed:', error.message);
      
      return {
        success: false,
        error: error.message,
        errorCode: this.getErrorCode(error),
        amount: amount,
        recipient: recipient,
        network: this.network?.name || 'Unknown',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get USDC contract information
   * @returns {Promise<object>} Contract details
   */
  async getContractInfo() {
    this.validateInitialization();
    
    try {
      const [name, symbol, decimals] = await Promise.all([
        this.usdcContract.name(),
        this.usdcContract.symbol(),
        this.usdcContract.decimals()
      ]);
      
      return {
        name,
        symbol,
        decimals: Number(decimals),
        address: await this.usdcContract.getAddress()
      };
    } catch (error) {
      throw new Error(`Failed to get contract info: ${error.message}`);
    }
  }

  /**
   * Validate that the handler is initialized
   * @throws {Error} If not initialized
   */
  validateInitialization() {
    if (!this.initialized) {
      throw new Error('Donation handler not initialized. Call initialize() first.');
    }
  }

  /**
   * Get error code for different types of errors
   * @param {Error} error - The error object
   * @returns {string} Error code
   */
  getErrorCode(error) {
    if (error.message.includes('insufficient funds')) {
      return 'INSUFFICIENT_FUNDS';
    }
    if (error.message.includes('network')) {
      return 'NETWORK_ERROR';
    }
    if (error.message.includes('Invalid')) {
      return 'INVALID_INPUT';
    }
    if (error.message.includes('gas')) {
      return 'GAS_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }

  /**
   * Detect network from RPC URL
   * @param {string} rpcUrl - RPC endpoint URL
   * @returns {string} Network name
   */
  static detectNetwork(rpcUrl) {
    const url = rpcUrl.toLowerCase();
    
    if (url.includes('polygon')) {
      return 'polygon';
    } else if (url.includes('sepolia')) {
      return 'sepolia';
    } else if (url.includes('mainnet') || url.includes('ethereum')) {
      return 'ethereum';
    }
    
    return 'unknown';
  }

  /**
   * Get network configuration
   * @param {string} network - Network name
   * @returns {object} Network configuration
   */
  static getNetworkConfig(network) {
    return NETWORK_CONFIG[network] || null;
  }
}

/**
 * Initialize and create a donation handler instance
 * @returns {Promise<DonationHandler>} Initialized donation handler
 */
async function createDonationHandler() {
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.USER_WALLET_PK;
  const usdcContract = process.env.USDC_CONTRACT;
  
  if (!rpcUrl || !privateKey || !usdcContract) {
    throw new Error('Missing required environment variables: RPC_URL, USER_WALLET_PK, or USDC_CONTRACT');
  }
  
  const handler = new DonationHandler();
  await handler.initialize(rpcUrl, privateKey, usdcContract);
  
  return handler;
}

/**
 * Quick donation function for simple use cases
 * @param {string} amount - Amount to donate (in USDC)
 * @param {string} recipient - Recipient wallet address (optional, defaults to env)
 * @returns {Promise<object>} Transaction result
 */
async function quickDonate(amount, recipient = null) {
  const handler = await createDonationHandler();
  const recipientAddress = recipient || process.env.RECIPIENT_WALLET;
  
  if (!recipientAddress) {
    throw new Error('No recipient address provided or found in environment');
  }
  
  return await handler.donate(recipientAddress, amount);
}

module.exports = {
  DonationHandler,
  createDonationHandler,
  quickDonate,
  NETWORK_CONFIG
}; 