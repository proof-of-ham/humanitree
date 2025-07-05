const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const solc = require('solc');
require('dotenv').config();

/**
 * Compile Solidity contract
 */
function compileContract(contractPath) {
    const source = fs.readFileSync(contractPath, 'utf8');
    
    const input = {
        language: 'Solidity',
        sources: {
            'SimpleDEX.sol': {
                content: source
            }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['*']
                }
            }
        }
    };
    
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors) {
        const errors = output.errors.filter(error => error.severity === 'error');
        if (errors.length > 0) {
            console.error('❌ Compilation errors:');
            errors.forEach(error => console.error(error.formattedMessage));
            throw new Error('Contract compilation failed');
        }
        
        // Show warnings
        const warnings = output.errors.filter(error => error.severity === 'warning');
        if (warnings.length > 0) {
            console.warn('⚠️  Compilation warnings:');
            warnings.forEach(warning => console.warn(warning.formattedMessage));
        }
    }
    
    const contract = output.contracts['SimpleDEX.sol']['SimpleDEX'];
    return {
        bytecode: contract.evm.bytecode.object,
        abi: contract.abi
    };
}

/**
 * Deploy SimpleDEX contract to Polygon Amoy Testnet
 */
async function deploySimpleDEX() {
    console.log('🚀 Deploying SimpleDEX contract to Polygon Amoy...\\n');
    
    // Check environment variables
    if (!process.env.RPC_URL) {
        throw new Error('RPC_URL not found in environment variables');
    }
    if (!process.env.USER_WALLET_PK) {
        throw new Error('USER_WALLET_PK not found in environment variables');
    }
    if (!process.env.MOCK_WLD_CONTRACT) {
        throw new Error('MOCK_WLD_CONTRACT not found in environment variables');
    }
    
    // Token addresses
    const mockWldAddress = process.env.MOCK_WLD_CONTRACT;
    const usdcAddress = '0x8B0180f2101c8260d49339abfEe87927412494B4'; // USDC on Amoy
    
    console.log('📋 Deployment Configuration:');
    console.log('   Mock WLD Token:', mockWldAddress);
    console.log('   USDC Token:', usdcAddress);
    console.log('');
    
    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const signer = new ethers.Wallet(process.env.USER_WALLET_PK, provider);
    
    console.log('📡 Network:', await provider.getNetwork());
    console.log('💰 Deployer:', signer.address);
    
    // Check balance
    const balance = await provider.getBalance(signer.address);
    console.log('💰 Balance:', ethers.formatEther(balance), 'POL');
    console.log('');
    
    // Compile contract
    console.log('🔧 Compiling SimpleDEX contract...');
    const contractPath = path.join(__dirname, '../contracts/SimpleDEX.sol');
    const { bytecode, abi } = compileContract(contractPath);
    console.log('✅ Contract compiled successfully');
    console.log('');
    
    // Create contract factory
    const contractFactory = new ethers.ContractFactory(abi, bytecode, signer);
    
    // Deploy contract with sufficient gas
    console.log('📦 Deploying contract...');
    const deployTx = await contractFactory.deploy(mockWldAddress, usdcAddress, {
        gasLimit: 3000000, // Use a safe gas limit
    });
    
    console.log('⏳ Transaction sent:', deployTx.deploymentTransaction().hash);
    console.log('⏳ Waiting for confirmation...');
    
    // Wait for deployment
    await deployTx.waitForDeployment();
    const deployedContract = await deployTx.getAddress();
    
    console.log('\\n🎉 SimpleDEX Contract Deployed Successfully!');
    console.log('📍 Contract Address:', deployedContract);
    console.log('🔗 Transaction Hash:', deployTx.deploymentTransaction().hash);
    console.log('');
    
    // Get deployment receipt
    const receipt = await deployTx.deploymentTransaction().wait();
    console.log('⛽ Gas Used:', receipt.gasUsed.toString());
    console.log('💰 Gas Price:', ethers.formatUnits(receipt.gasPrice, 'gwei'), 'gwei');
    console.log('💸 Transaction Cost:', ethers.formatEther(receipt.gasUsed * receipt.gasPrice), 'POL');
    console.log('');
    
    // Verify contract deployment
    console.log('🔍 Verifying contract deployment...');
    const simpleDex = new ethers.Contract(deployedContract, abi, signer);
    
    try {
        const token0 = await simpleDex.token0();
        const token1 = await simpleDex.token1();
        const poolInfo = await simpleDex.getPoolInfo();
        
        console.log('✅ Contract verification successful:');
        console.log('   Token0:', token0);
        console.log('   Token1:', token1);
        console.log('   Pool Info:', {
            reserve0: poolInfo[0].toString(),
            reserve1: poolInfo[1].toString(),
            totalLiquidity: poolInfo[2].toString(),
            symbol0: poolInfo[3],
            symbol1: poolInfo[4]
        });
        console.log('');
        
    } catch (error) {
        console.error('❌ Contract verification failed:', error.message);
        throw error;
    }
    
    // Save deployment information
    const deploymentInfo = {
        network: 'Polygon Amoy',
        chainId: 80002,
        contractAddress: deployedContract,
        transactionHash: deployTx.deploymentTransaction().hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.gasPrice.toString(),
        deploymentCost: ethers.formatEther(receipt.gasUsed * receipt.gasPrice),
        timestamp: new Date().toISOString(),
        deployer: signer.address,
        constructorArgs: [mockWldAddress, usdcAddress],
        abi: abi
    };
    
    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // Save deployment info
    const deploymentPath = path.join(deploymentsDir, 'simple-dex-deployment.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log('💾 Deployment info saved to:', deploymentPath);
    console.log('');
    
    // Update environment variables
    console.log('🔧 Environment Variable:');
    console.log('   Add this to your .env file:');
    console.log('   SIMPLE_DEX_CONTRACT=' + deployedContract);
    console.log('');
    
    return deploymentInfo;
}

// Run deployment
if (require.main === module) {
    deploySimpleDEX()
        .then((info) => {
            console.log('✅ SimpleDEX deployment completed successfully!');
            console.log('📍 Contract Address:', info.contractAddress);
            console.log('🔗 Transaction:', info.transactionHash);
        })
        .catch((error) => {
            console.error('❌ Deployment failed:', error);
            process.exit(1);
        });
}

module.exports = { deploySimpleDEX }; 