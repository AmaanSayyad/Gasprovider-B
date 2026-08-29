#!/bin/bash

# Deploy Treasury contracts to all supported testnets
# This script runs the deployment script for each network sequentially

echo "=========================================="
echo "DEPLOYING TREASURY TO ALL TESTNETS"
echo "=========================================="
echo ""

# Array of networks to deploy to
networks=(
  "coston2"
  "sepolia"
  "bscTestnet"
  "polygonMumbai"
  "avalancheFuji"
  "arbitrumSepolia"
  "optimismSepolia"
)

# Track deployment results
successful=()
failed=()

# Deploy to each network
for network in "${networks[@]}"; do
  echo ""
  echo "=========================================="
  echo "Deploying to $network..."
  echo "=========================================="
  
  if npx hardhat run scripts/deploy-treasury-multichain.ts --network "$network"; then
    successful+=("$network")
    echo "✓ Successfully deployed to $network"
  else
    failed+=("$network")
    echo "✗ Failed to deploy to $network"
  fi
  
  # Wait a bit between deployments to avoid rate limiting
  sleep 2
done

# Print summary
echo ""
echo "=========================================="
echo "DEPLOYMENT SUMMARY"
echo "=========================================="
echo ""
echo "Successful deployments (${#successful[@]}):"
for network in "${successful[@]}"; do
  echo "  ✓ $network"
done

if [ ${#failed[@]} -gt 0 ]; then
  echo ""
  echo "Failed deployments (${#failed[@]}):"
  for network in "${failed[@]}"; do
    echo "  ✗ $network"
  done
  echo ""
  echo "Please check the errors above and retry failed deployments."
  exit 1
else
  echo ""
  echo "All deployments completed successfully!"
  echo ""
  echo "Deployment records saved to: deployments/treasury-addresses.json"
  echo ""
  echo "Next steps:"
  echo "1. Verify contracts on block explorers"
  echo "2. Fund Treasury contracts with testnet tokens"
  echo "3. Update backend configuration with Treasury addresses"
fi

echo ""
echo "=========================================="
