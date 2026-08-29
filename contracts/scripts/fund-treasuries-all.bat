@echo off
REM Fund Treasury contracts on all deployed networks
REM This script sends native tokens from deployer to each Treasury

echo ==========================================
echo FUNDING ALL TREASURY CONTRACTS
echo ==========================================
echo.

REM Array of networks to fund
set networks=coston2 sepolia polygonAmoy arbitrumSepolia optimismSepolia

REM Track funding results
set successful=0
set failed=0

REM Fund each network
for %%n in (%networks%) do (
  echo.
  echo ==========================================
  echo Funding Treasury on %%n...
  echo ==========================================
  
  call npx hardhat run scripts/fund-treasuries.ts --network %%n
  
  if errorlevel 1 (
    echo X Failed to fund %%n
    set /a failed+=1
  ) else (
    echo √ Successfully funded %%n
    set /a successful+=1
  )
  
  REM Wait a bit between transactions
  timeout /t 2 /nobreak >nul
)

REM Print summary
echo.
echo ==========================================
echo FUNDING SUMMARY
echo ==========================================
echo.
echo Successful: %successful%
echo Failed: %failed%
echo.

if %failed% gtr 0 (
  echo Please check the errors above and retry failed networks.
  exit /b 1
) else (
  echo All Treasury contracts funded successfully!
  echo.
  echo Next steps:
  echo 1. Verify balances on block explorers
  echo 2. Test deposit functionality
  echo 3. Update backend configuration
)

echo.
echo ==========================================
