#!/bin/bash
# ═══════════════════════════════════════════════════════
# Switch back to SQLite for local development
# Run this AFTER deploying to Vercel
# ═══════════════════════════════════════════════════════

echo "🔄 Switching Prisma schema back to SQLite..."

# Replace provider line
sed -i 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma

# Clean up
rm -rf .next
echo "✅ Schema switched to SQLite"
echo "   Run: bun run dev  to start local development"
