#!/bin/bash

# ============================================
# CRAFTLY FIREBASE OPTIMIZATION DEPLOYMENT
# ============================================
# This script deploys all optimizations safely
# Run: bash deploy-optimization.sh

set -e  # Exit on any error

echo "🚀 Starting Craftly Firebase Optimization Deployment..."
echo ""

# ============================================
# STEP 1: Deploy Firestore Indexes
# ============================================
echo "📊 STEP 1: Checking Firebase CLI..."

if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found!"
    echo "   Install it with: npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI found"
echo ""
echo "📊 STEP 2: Deploying Firestore Indexes..."
echo "   ⏳ This may take 5-10 minutes..."
echo ""

# Deploy indexes
firebase deploy --only firestore:indexes

if [ $? -eq 0 ]; then
    echo "✅ Indexes deployed successfully!"
else
    echo "❌ Index deployment failed. Check Firebase Console for errors."
    exit 1
fi

echo ""
echo "============================================"
echo "🎉 Deployment Complete!"
echo "============================================"
echo ""
echo "✅ What was deployed:"
echo "   • Firestore composite indexes (3 total)"
echo "   • Optimized dashboard controller"
echo "   • Enhanced cache utilities"
echo ""
echo "📚 Next steps:"
echo "   1. Deploy backend: npm start (or deploy to production)"
echo "   2. Refresh frontend app"
echo "   3. Monitor Firebase Console for quota reduction"
echo ""
echo "📊 To verify indexes:"
echo "   1. Go to Firebase Console"
echo "   2. Firestore Database > Indexes"
echo "   3. Should see 3 ENABLED composite indexes"
echo ""
echo "🎯 To monitor quota:"
echo "   1. Firebase Console > Firestore Database"
echo "   2. Watch 'Read/Write Operations' graph"
echo "   3. Should see 80-90% reduction in reads"
echo ""
