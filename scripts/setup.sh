#!/bin/bash

echo "🚀 Playlist Converter - Setup Script"
echo "======================================"

echo ""
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "🔨 Building application..."
pnpm build

echo ""
echo "🗄️  Pushing database schema..."
pnpm db:push

echo ""
echo "✅ Setup complete!"
echo ""
echo "Your app should now be ready at your Sevalla URL."

