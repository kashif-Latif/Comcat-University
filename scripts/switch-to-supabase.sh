#!/bin/bash
# ═══════════════════════════════════════════════════════
# Switch to Supabase (PostgreSQL) for Vercel deployment
# Run this BEFORE: vercel deploy
# ═══════════════════════════════════════════════════════

echo "🔄 Switching Prisma schema to PostgreSQL (Supabase)..."

# Replace provider line
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

echo "✅ Schema switched to PostgreSQL"
echo ""
echo "⚠️  IMPORTANT: Make sure your .env.local or Vercel env has:"
echo '   DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"'
echo ""
echo "📋 Next steps:"
echo "   1. Run: bun run db:push   (to create tables in Supabase)"
echo "   2. Run: vercel deploy     (to deploy to Vercel)"
echo "   3. Run: bash scripts/switch-to-sqlite.sh  (to switch back for local dev)"
