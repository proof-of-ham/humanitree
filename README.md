# 🌱 TreePlanter Social App

A mobile-optimized social app for World that verifies humanity with World ID, plants real trees through NGO partnerships, and celebrates environmental impact.

## ✨ Features

- 🔐 **World ID Verification** - Prove you're a unique human
- 🌳 **Real Tree Planting** - Partner with verified NGOs to plant actual trees
- 🎉 **Impact Celebration** - Beautiful animations and achievements
- 📱 **Mobile-First Design** - Optimized for mobile devices
- 🤝 **Social Features** - Community feed and sharing
- 📊 **Impact Tracking** - Track your environmental contribution
- 🌍 **Global Reach** - Plant trees worldwide through various NGOs

## 🚀 Quick Start

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Configure World ID
1. Go to [World Developer Portal](https://developer.worldcoin.org)
2. Create a new app
3. Copy your App ID
4. Create `.env.local`:

\`\`\`env
WLD_APP_ID=your_actual_app_id_here
WLD_ACTION=plant-tree
\`\`\`

### 3. Update App ID in Code
Replace the placeholder in `app/page.tsx`:
\`\`\`tsx
app_id="your_actual_app_id_here"
\`\`\`

### 4. Run Development Server
\`\`\`bash
npm run dev
\`\`\`

### 5. Deploy & Configure
1. Deploy to Vercel/Netlify
2. Add your deployment URL to World Developer Portal
3. Configure NGO API keys (optional for demo)

## 🌍 NGO Integration

The app integrates with multiple tree-planting NGOs:

- **One Tree Planted** - Global reforestation
- **Trees for the Future** - Sustainable farming
- **Eden Reforestation** - Ecosystem restoration

### Adding Real NGO APIs

Replace the mock API calls in `app/actions/plant-tree.ts` with real NGO endpoints:

\`\`\`typescript
const response = await fetch(ngoEndpoint, {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.NGO_API_KEY}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: userNullifier,
    location: selectedLocation,
    species: selectedSpecies
  })
})
\`\`\`

## 📱 Mobile Features

- **Touch-Optimized UI** - Large buttons and touch targets
- **Responsive Design** - Works on all screen sizes
- **Native Sharing** - Uses Web Share API when available
- **Offline Support** - Local storage for user data
- **Progressive Web App** - Can be installed on mobile devices

## 🎨 Design System

- **Green Theme** - Reflects environmental focus
- **Smooth Animations** - Engaging user experience
- **Accessibility** - WCAG compliant design
- **Modern UI** - Clean, minimalist interface

## 🔒 Privacy & Security

- **Zero-Knowledge Proofs** - World ID protects user privacy
- **No Personal Data** - Only nullifier hash is stored
- **Secure API Calls** - All NGO communications are encrypted
- **Local Storage** - User preferences stored locally

## 🌟 Social Features

- **Community Feed** - See other users' tree planting activities
- **Achievement Sharing** - Share your environmental impact
- **Leaderboards** - Gamified tree planting experience
- **Impact Visualization** - Beautiful charts and stats

## 📊 Environmental Impact

Each tree planted contributes to:
- **CO₂ Absorption** - ~22kg CO₂ per year per tree
- **Biodiversity** - Habitat for wildlife
- **Soil Health** - Prevents erosion
- **Local Communities** - Economic opportunities

## 🛠️ Technical Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **World ID SDK** - Human verification
- **Lucide Icons** - Beautiful iconography
- **shadcn/ui** - Modern UI components

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository
2. Add environment variables
3. Deploy automatically

### Other Platforms
- Netlify
- Railway
- Render
- Any Node.js hosting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this code for your own projects!

## 🌱 Make a Difference

Every tree planted through this app contributes to fighting climate change and supporting local communities worldwide. Join the movement! 🌍
