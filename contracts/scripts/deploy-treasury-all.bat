@echo off
REM Deploy Treasury contracts to all supported testnets
REM This script runs the deployment script for each network sequentially

echo ==========================================
echo DEPLOYING TREASURY TO ALL TESTNETS
echo ==========================================
echo.

REM Array of networks to deploy to (only funded networks)
set networks=coston2 sepolia polygonAmoy arbitrumSepolia optimismSepolia

REM Track deployment results
set successful=0
set failed=0

REM Deploy to each network
for %%n in (%networks%) do (
  echo.
  echo ==========================================
  echo Deploying to %%n...
  echo ==========================================
  
  call npx hardhat run scripts/deploy-treasury-multichain.ts --network %%n
  
  if errorlevel 1 (
    echo X Failed to deploy to %%n
    set /a failed+=1
  ) else (
    echo √ Successfully deployed to %%n
    set /a successful+=1
  )
  
  REM Wait a bit between deployments to avoid rate limiting
  timeout /t 2 /nobreak >nul
)

REM Print summary
echo.
echo ==========================================
echo DEPLOYMENT SUMMARY
echo ==========================================
echo.
echo Successful deployments: %successful%
echo Failed deployments: %failed%
echo.

if %failed% gtr 0 (
  echo Please check the errors above and retry failed deployments.
  exit /b 1
) else (
  echo All deployments completed successfully!
  echo.
  echo Deployment records saved to: deployments\treasury-addresses.json
  echo.
  echo Next steps:
  echo 1. Verify contracts on block explorers
  echo 2. Fund Treasury contracts with testnet tokens
  echo 3. Update backend configuration with Treasury addresses
)

echo.
echo ==========================================
