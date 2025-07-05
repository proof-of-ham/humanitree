const { ethers } = require('ethers');
require('dotenv').config();

/**
 * Tree Purchase Service for Humanitree
 * Simulates donations to Rainforest Foundation using testnet USDC
 * Based on real impact data from https://rainforestfoundation.org/give/cryptocurrency/#donate-crypto
 */

class TreePurchaseService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://rpc-amoy.polygon.technology/');
        this.rainforestFoundationAddress = '0x98f5A404991Cc74590564cbECA88c8d8B76D6407'; // Real RF address
        this.testnetFoundationAddress = '0x1234567890123456789012345678901234567890'; // Mock testnet address
        this.usdcAddress = '0x8B0180f2101c8260d49339abfEe87927412494B4'; // Our testnet USDC
        
        // Tree purchase rates (based on RF impact data)
        this.impactRates = {
            treesPerDollar: 1.0,         // $1 = 1 tree (simplified)
            acresPerDollar: 0.5,         // $1 = 0.5 acres protected 
            minDonation: 0.1,            // Minimum $0.10 donation
            maxDonation: 1000.0          // Maximum $1000 donation per transaction
        };
        
        // USDC Contract ABI
        this.usdcABI = [
            'function transfer(address to, uint256 amount) returns (bool)',
            'function balanceOf(address account) view returns (uint256)',
            'function allowance(address owner, address spender) view returns (uint256)',
            'function approve(address spender, uint256 amount) returns (bool)',
            'function decimals() view returns (uint8)'
        ];
        
        // Store donation history in memory (in production, use database)
        this.donationHistory = [];
    }

    /**
     * Calculate environmental impact for a USDC donation amount
     * @param {number} usdcAmount - Amount in USDC (e.g., 10.5)
     * @returns {Object} Impact calculations
     */
    calculateImpact(usdcAmount) {
        const trees = Math.floor(usdcAmount * this.impactRates.treesPerDollar);
        const acres = (usdcAmount * this.impactRates.acresPerDollar).toFixed(2);
        
        // Calculate protection duration (1 year per dollar simplified)
        const protectionMonths = Math.floor(usdcAmount * 12);
        
        return {
            usdcAmount: parseFloat(usdcAmount),
            treesPlanted: trees,
            acresProtected: parseFloat(acres),
            protectionMonths: protectionMonths,
            co2Offset: Math.floor(trees * 48), // ~48 lbs CO2 per tree per year
            impactStatement: this.generateImpactStatement(trees, acres, protectionMonths)
        };
    }

    /**
     * Generate human-readable impact statement
     * @param {number} trees - Number of trees
     * @param {number} acres - Acres protected
     * @param {number} months - Protection months
     * @returns {string} Impact statement
     */
    generateImpactStatement(trees, acres, months) {
        const statements = [];
        
        if (trees > 0) {
            statements.push(`${trees} tree${trees > 1 ? 's' : ''} planted`);
        }
        
        if (acres > 0) {
            statements.push(`${acres} acres of rainforest protected`);
        }
        
        if (months > 0) {
            const years = Math.floor(months / 12);
            const remainingMonths = months % 12;
            
            if (years > 0) {
                statements.push(`${years} year${years > 1 ? 's' : ''} of protection`);
            }
            if (remainingMonths > 0) {
                statements.push(`${remainingMonths} month${remainingMonths > 1 ? 's' : ''} additional protection`);
            }
        }
        
        return statements.join(' • ');
    }

    /**
     * Validate donation amount and user address
     * @param {number} usdcAmount - Donation amount in USDC
     * @param {string} donorAddress - Ethereum address of donor
     * @returns {Object} Validation result
     */
    validateDonation(usdcAmount, donorAddress) {
        const errors = [];
        
        // Validate amount
        if (!usdcAmount || isNaN(usdcAmount) || usdcAmount <= 0) {
            errors.push('Invalid donation amount');
        }
        
        if (usdcAmount < this.impactRates.minDonation) {
            errors.push(`Minimum donation is $${this.impactRates.minDonation} USDC`);
        }
        
        if (usdcAmount > this.impactRates.maxDonation) {
            errors.push(`Maximum donation is $${this.impactRates.maxDonation} USDC`);
        }
        
        // Validate address
        if (!donorAddress || !ethers.isAddress(donorAddress)) {
            errors.push('Invalid donor address');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Check if user has sufficient USDC balance and allowance
     * @param {string} donorAddress - Donor's wallet address
     * @param {number} usdcAmount - Amount to donate
     * @returns {Object} Balance check result
     */
    async checkBalance(donorAddress, usdcAmount) {
        try {
            const usdc = new ethers.Contract(this.usdcAddress, this.usdcABI, this.provider);
            const amountWei = ethers.parseUnits(usdcAmount.toString(), 6);
            
            const balance = await usdc.balanceOf(donorAddress);
            const decimals = await usdc.decimals();
            const balanceFormatted = parseFloat(ethers.formatUnits(balance, decimals));
            
            return {
                hasBalance: balance >= amountWei,
                currentBalance: balanceFormatted,
                requiredAmount: usdcAmount,
                shortfall: Math.max(0, usdcAmount - balanceFormatted)
            };
        } catch (error) {
            throw new Error(`Balance check failed: ${error.message}`);
        }
    }

    /**
     * Execute tree purchase donation (testnet simulation)
     * @param {string} donorAddress - Donor's wallet address
     * @param {number} usdcAmount - Amount to donate in USDC
     * @param {string} privateKey - Donor's private key for signing
     * @returns {Object} Transaction result
     */
    async executeDonation(donorAddress, usdcAmount, privateKey) {
        try {
            console.log(`🌳 Executing tree purchase donation...`);
            console.log(`   Donor: ${donorAddress}`);
            console.log(`   Amount: ${usdcAmount} USDC`);
            
            // Validate donation
            const validation = this.validateDonation(usdcAmount, donorAddress);
            if (!validation.valid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }
            
            // Check balance
            const balanceCheck = await this.checkBalance(donorAddress, usdcAmount);
            if (!balanceCheck.hasBalance) {
                throw new Error(`Insufficient balance. Have ${balanceCheck.currentBalance} USDC, need ${balanceCheck.requiredAmount} USDC`);
            }
            
            // Setup signer
            const signer = new ethers.Wallet(privateKey, this.provider);
            const usdc = new ethers.Contract(this.usdcAddress, this.usdcABI, signer);
            
            // Convert to wei
            const amountWei = ethers.parseUnits(usdcAmount.toString(), 6);
            
            // Execute transfer to testnet foundation address
            console.log(`💸 Transferring ${usdcAmount} USDC to foundation...`);
            const tx = await usdc.transfer(this.testnetFoundationAddress, amountWei);
            
            console.log(`⏳ Transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait();
            
            // Calculate impact
            const impact = this.calculateImpact(usdcAmount);
            
            // Generate donation record
            const donationRecord = {
                id: this.generateDonationId(),
                timestamp: new Date().toISOString(),
                donor: donorAddress,
                amount: usdcAmount,
                currency: 'USDC',
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                impact: impact,
                status: 'completed',
                foundationAddress: this.testnetFoundationAddress,
                network: 'Polygon Amoy Testnet'
            };
            
            // Store donation history
            this.donationHistory.push(donationRecord);
            
            console.log(`✅ Tree purchase completed!`);
            console.log(`   Trees planted: ${impact.treesPlanted}`);
            console.log(`   Acres protected: ${impact.acresProtected}`);
            console.log(`   CO2 offset: ${impact.co2Offset} lbs`);
            
            return donationRecord;
            
        } catch (error) {
            console.error(`❌ Donation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate unique donation ID
     * @returns {string} Unique donation ID
     */
    generateDonationId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `TREE_${timestamp}_${random}`.toUpperCase();
    }

    /**
     * Get donation history for a donor
     * @param {string} donorAddress - Donor's wallet address
     * @returns {Array} Array of donation records
     */
    getDonationHistory(donorAddress) {
        return this.donationHistory.filter(donation => 
            donation.donor.toLowerCase() === donorAddress.toLowerCase()
        );
    }

    /**
     * Get total impact statistics
     * @returns {Object} Aggregated impact statistics
     */
    getTotalImpact() {
        const totalDonations = this.donationHistory.length;
        const totalAmount = this.donationHistory.reduce((sum, donation) => sum + donation.amount, 0);
        const totalTrees = this.donationHistory.reduce((sum, donation) => sum + donation.impact.treesPlanted, 0);
        const totalAcres = this.donationHistory.reduce((sum, donation) => sum + donation.impact.acresProtected, 0);
        const totalCO2 = this.donationHistory.reduce((sum, donation) => sum + donation.impact.co2Offset, 0);
        
        return {
            totalDonations,
            totalAmount,
            totalTrees,
            totalAcres,
            totalCO2,
            averageDonation: totalDonations > 0 ? (totalAmount / totalDonations).toFixed(2) : 0
        };
    }

    /**
     * Generate donation receipt
     * @param {Object} donationRecord - Donation record
     * @returns {Object} Formatted receipt
     */
    generateReceipt(donationRecord) {
        return {
            receiptId: donationRecord.id,
            date: new Date(donationRecord.timestamp).toLocaleDateString(),
            time: new Date(donationRecord.timestamp).toLocaleTimeString(),
            donor: donationRecord.donor,
            amount: `${donationRecord.amount} ${donationRecord.currency}`,
            txHash: donationRecord.txHash,
            impact: donationRecord.impact,
            impactStatement: donationRecord.impact.impactStatement,
            thankYouMessage: this.generateThankYouMessage(donationRecord.impact),
            foundationInfo: {
                name: "Rainforest Foundation US",
                website: "https://rainforestfoundation.org",
                mission: "Protecting rainforests and Indigenous rights since 1989"
            }
        };
    }

    /**
     * Generate personalized thank you message
     * @param {Object} impact - Impact object
     * @returns {string} Thank you message
     */
    generateThankYouMessage(impact) {
        const messages = [
            `🌳 Amazing! Your donation will plant ${impact.treesPlanted} tree${impact.treesPlanted > 1 ? 's' : ''} and protect ${impact.acresProtected} acres of precious rainforest.`,
            `🌿 Thank you for making a real difference! You're helping Indigenous communities protect their ancestral lands.`,
            `🌎 Your contribution will offset ${impact.co2Offset} lbs of CO2 and help fight climate change.`,
            `💚 Every tree counts! Together we're building a sustainable future for our planet.`
        ];
        
        return messages[Math.floor(Math.random() * messages.length)];
    }

    /**
     * Get donation by ID
     * @param {string} donationId - Donation ID
     * @returns {Object|null} Donation record or null
     */
    getDonationById(donationId) {
        return this.donationHistory.find(donation => donation.id === donationId) || null;
    }

    /**
     * Get recent donations (last 10)
     * @returns {Array} Array of recent donation records
     */
    getRecentDonations() {
        return this.donationHistory
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
    }
}

module.exports = TreePurchaseService; 