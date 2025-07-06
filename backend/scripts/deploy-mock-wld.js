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
            'MockWLD.sol': {
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
            console.error('Compilation errors:');
            errors.forEach(error => console.error(error.formattedMessage));
            throw new Error('Contract compilation failed');
        }
        
        // Print warnings
        const warnings = output.errors.filter(error => error.severity === 'warning');
        if (warnings.length > 0) {
            console.warn('Compilation warnings:');
            warnings.forEach(warning => console.warn(warning.formattedMessage));
        }
    }
    
    const contract = output.contracts['MockWLD.sol']['MockWLD'];
    return {
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object
    };
}

/**
 * Deploy Mock WLD Token to Polygon Amoy Testnet
 */
async function deployMockWLD() {
    console.log('🚀 Deploying Mock WLD Token to Polygon Amoy...\n');
    
    // Check environment variables
    if (!process.env.RPC_URL) {
        throw new Error('RPC_URL not found in environment variables');
    }
    if (!process.env.USER_WALLET_PK) {
        throw new Error('USER_WALLET_PK not found in environment variables');
    }
    
    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const signer = new ethers.Wallet(process.env.USER_WALLET_PK, provider);
    
    console.log('📡 Network:', await provider.getNetwork());
    console.log('👤 Deployer:', signer.address);
    
    // Check balance
    const balance = await provider.getBalance(signer.address);
    console.log('💰 Balance:', ethers.formatEther(balance), 'POL');
    
    if (balance < ethers.parseEther('0.01')) {
        console.warn('⚠️  Warning: Low balance. Make sure you have enough POL for deployment');
    }
    
    // Compile contract
    console.log('\n⚙️  Compiling contract...');
    const contractPath = path.join(__dirname, '../contracts/MockWLD.sol');
    const { abi, bytecode } = compileContract(contractPath);
    console.log('✅ Contract compiled successfully');
    
    // Create contract factory
    const contractFactory = new ethers.ContractFactory(abi, bytecode, signer);
    
    // Deploy contract with higher gas limit
    console.log('\n📦 Deploying contract...');
    const deployTx = await contractFactory.deploy({
        gasLimit: 2000000, // Increase gas limit significantly
    });
    
    console.log('⏳ Transaction sent:', deployTx.deploymentTransaction().hash);
    console.log('⏳ Waiting for deployment...');
    
    // Wait for deployment
    const deployedContract = await deployTx.waitForDeployment();
    const contractAddress = await deployedContract.getAddress();
    
    console.log('\n✅ Mock WLD Token deployed successfully!');
    console.log('📍 Contract Address:', contractAddress);
    
    // Verify deployment
    console.log('\n🔍 Verifying deployment...');
    const name = await deployedContract.name();
    const symbol = await deployedContract.symbol();
    const decimals = await deployedContract.decimals();
    const totalSupply = await deployedContract.totalSupply();
    const deployerBalance = await deployedContract.balanceOf(signer.address);
    
    console.log('📛 Name:', name);
    console.log('🔤 Symbol:', symbol);
    console.log('🔢 Decimals:', decimals);
    console.log('💰 Total Supply:', ethers.formatUnits(totalSupply, decimals), 'WLD');
    console.log('👤 Deployer Balance:', ethers.formatUnits(deployerBalance, decimals), 'WLD');
    
    // Fund the faucet with some tokens
    console.log('\n💧 Funding faucet...');
    const faucetAmount = ethers.parseUnits('10000', decimals); // 10,000 WLD for faucet
    const fundTx = await deployedContract.fundFaucet(faucetAmount);
    await fundTx.wait();
    
    const faucetBalance = await deployedContract.balanceOf(contractAddress);
    console.log('💧 Faucet Balance:', ethers.formatUnits(faucetBalance, decimals), 'WLD');
    
    // Test faucet function
    console.log('\n🧪 Testing faucet function...');
    const [nextClaimTime, claimAmount, canClaim] = await deployedContract.getFaucetInfo(signer.address);
    console.log('💧 Can claim from faucet:', canClaim);
    console.log('💧 Claim amount:', ethers.formatUnits(claimAmount, decimals), 'WLD');
    
    // Save deployment info
    const deploymentInfo = {
        network: 'polygon-amoy',
        contractAddress,
        deployerAddress: signer.address,
        deploymentHash: deployTx.deploymentTransaction().hash,
        timestamp: new Date().toISOString(),
        contractInfo: {
            name,
            symbol,
            decimals: decimals.toString(),
            totalSupply: totalSupply.toString(),
            faucetAmount: claimAmount.toString(),
            faucetCooldown: '3600' // 1 hour in seconds
        },
        abi: abi
    };
    
    // Save to file
    const deploymentsDir = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(deploymentsDir, 'mock-wld-deployment.json'),
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log('\n💾 Deployment info saved to:', path.join(deploymentsDir, 'mock-wld-deployment.json'));
    
    // Update environment example
    console.log('\n📝 Add these to your .env file:');
    console.log(`MOCK_WLD_CONTRACT=${contractAddress}`);
    
    return {
        contractAddress,
        deploymentInfo
    };
}

// Run deployment if called directly
if (require.main === module) {
    deployMockWLD()
        .then(({ contractAddress }) => {
            console.log('\n🎉 Deployment completed successfully!');
            console.log('📍 Contract Address:', contractAddress);
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Deployment failed:');
            console.error(error);
            process.exit(1);
        });
}

module.exports = { deployMockWLD }; 