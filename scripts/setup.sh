#!/bin/bash
set -e

echo "🔨 Building application..."
pnpm build

echo "🗄️  Pushing database schema..."
pnpm db:push

echo "✅ Build complete!"
