#!/bin/bash

# GasProvider Deployment Script for Coston2
# This script checks prerequisites and deploys the contract

echo "========================================================================"
echo "GasProvider Deployment to Coston2"
echo "========================================================================"
echo ""

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ ERROR: PRIVATE_KEY environment variable is not set"
    echo ""
    echo "Please set your private key:"
    echo "  export PRIVATE_KEY=0x..."
    echo ""
    echo "Or create a .env file in the contracts directory with:"
    echo "  PRIVATE_KEY=0x..."
    echo ""
    exit 1
fi

echo "✓ PRIVATE_KEY is set"
echo ""

# Check prerequisites
echo "Step 1: Checking deployment prerequisites..."
npx hardhat run scripts/check-deployment-ready.ts --network coston2

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Prerequisites check failed"
    echo ""
    echo "Please:"
    echo "  1. Get C2FLR tokens from: https://faucet.flare.network/"
    echo "  2. Wait for tokens to arrive (usually takes 1-2 minutes)"
    echo "  3. Run this script again"
    echo ""
    exit 1
fi

echo ""
echo "Step 2: Compiling contracts..."
npm run compile

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Compilation failed"
    exit 1
fi

echo ""
echo "Step 3: Deploying to Coston2..."
echo ""
npx hardhat run scripts/deploy-coston2.ts --network coston2

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "========================================================================"
echo "✓ DEPLOYMENT COMPLETE"
echo "========================================================================"
echo ""
echo "Next steps:"
echo "  1. Copy the contract addresses from above"
echo "  2. Update backend/.env.flare.local with the addresses"
echo "  3. Test the deployment with the frontend"
echo ""
