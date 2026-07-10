#!/usr/bin/env bash
set -e

# =============================================================================
# PrismAnalytics Git Auto-Upload Script for SudhirDevOps1
# Remote: https://github.com/SudhirDevOps1/PrismAnalytics.git
# =============================================================================

REMOTE_URL="https://github.com/SudhirDevOps1/PrismAnalytics.git"
BRANCH="main"

echo "🚀 Starting Git Auto-Upload Process for SudhirDevOps1..."

# 1. Ensure inside git repository
if [ ! -d ".git" ]; then
  echo "📦 Initializing clean git repository..."
  git init -b $BRANCH
fi

# 2. Configure Remote remote
if git remote | grep -q "origin"; then
  git remote set-url origin "$REMOTE_URL"
  echo "🔗 Updated origin remote to: $REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
  echo "🔗 Added origin remote: $REMOTE_URL"
fi

# 3. Add all production files
echo "🗂️ Staging updated production & documentation files..."
git add .

# 4. Commit exact state
COMMIT_MSG="feat(production): complete v1.0.0 rewrite with Raw IP mode and Inspector"
echo "✍️ Committing changes: \"$COMMIT_MSG\""
git commit -m "$COMMIT_MSG" || echo "Note: No new changes to commit."

# 5. Push exact execution helper instruction
echo ""
echo "============================================================================="
echo "✅ Git repository perfectly staged and committed!"
echo "To push to your remote GitHub repository, run this exact command locally:"
echo ""
echo "    git push -u origin main"
echo ""
echo "If you need to authenticate with a Personal Access Token (PAT):"
echo "    git push https://SudhirDevOps1:<YOUR_GITHUB_TOKEN>@github.com/SudhirDevOps1/PrismAnalytics.git main"
echo "============================================================================="
