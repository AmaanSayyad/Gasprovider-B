@echo off
REM Deploy Treasury to new networks: World, Zora, Scroll, Avalanche, Monad

echo ==========================================
echo DEPLOYING TO NEW NETWORKS
echo ==========================================
echo.

set networks=worldSepolia zoraSepolia scrollSepolia avalancheFuji monadTestnet

for %%n in (%networks%) do (
  echo.
  echo ==========================================
  echo Deploying to %%n...
  echo ==========================================
  
  call npx hardhat run scripts/deploy-treasury-multichain.ts --network %%n
  
  if errorlevel 1 (
    echo X Failed to deploy to %%n
  ) else (
    echo √ Successfully deployed to %%n
  )
  
  timeout /t 2 /nobreak >nul
)

echo.
echo ==========================================
echo DEPLOYMENT COMPLETE
echo ==========================================
