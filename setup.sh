#!/bin/bash

echo "🌱 Setting up TreePlanter Social App..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "🔧 Creating .env.local file..."
    cp .env.example .env.local
    echo "⚠️  Please update .env.local with your actual World ID App ID"
fi

# Build Tailwind CSS
echo "🎨 Building CSS..."
npm run build

echo "✅ Setup complete! Run 'npm run dev' to start the development server."
echo "📝 Don't forget to:"
echo "   1. Update your World ID App ID in .env.local"
echo "   2. Update the app_id in app/page.tsx"
echo "   3. Test the app on mobile devices"
