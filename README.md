# 🌳 Humanitree

**World ID verified tree planting mini app**

Plant real trees with one click using World ID proof-of-humanity and 1inch token swaps.

## 🎯 Concept

Only verified humans can plant trees, preventing sybil attacks on environmental donations while making it dead simple (one click).

## 🛠️ Tech Stack

- **Identity**: World ID (proof-of-humanity)
- **UI**: Next.js 13.4.4 + Tailwind CSS
- **Token Swap**: 1inch API (WLD → USDC)
- **Blockchain**: World Chain Sepolia
- **Smart Contracts**: Solidity + Hardhat

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- World App (for testing)
- World ID verification

### Installation

1. **Clone and install dependencies:**
```bash
cd humanitree
npm install
```

2. **Set up environment variables:**
```bash
cp env.template .env.local
# Edit .env.local with your actual values
```

3. **Run development server:**
```bash
npm run dev
```

## 🔧 Configuration Required

### 1. World ID Setup
- Register app at [World ID Developer Portal](https://developer.worldcoin.org)
- Create action: "plant-tree"
- Update `.env` or `.env.local` with the following variables:
  - `WLD_APP_ID=your_actual_app_id_here`
  - `WLD_ACTION=plant-tree`

### 2. 1inch API
- Get API key from [1inch Developer Portal](https://portal.1inch.io)
- Add to `.env.local`

### 3. Smart Contract Deployment
- Deploy to World Chain Sepolia
- Update contract address in `.env.local`

## 📱 World App Integration

This mini app is designed to run inside the World App:

1. **World ID Verification**: Automatic detection
2. **One-Click Tree Planting**: WLD → USDC → Donation
3. **Impact Tracking**: See total trees planted

## 🧪 Testing

Use the Worldcoin Simulator for local development:
- Generate test World ID proofs
- Test nullifier hash uniqueness
- Verify sybil resistance

## 🏗️ Development Tasks

Track progress with Taskmaster:
```bash
# View current tasks
task-master list

# Show next task
task-master next

# Update progress
task-master update-subtask --id=1.1 --prompt="Setup complete"
```

## 🌍 Deployment

Deploy to Vercel for World App integration:
```bash
npm run build
# Deploy to Vercel or similar platform
```

## 🤝 Contributing

Built for ETHcc Hackathon - World ID + 1inch integration showcase.

## 📄 License

MIT
