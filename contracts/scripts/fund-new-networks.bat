@echo off
REM Fund new Treasury deployments

echo ==========================================
echo FUNDING NEW TREASURIES
echo ==========================================
echo.

set networks=worldSepolia zoraSepolia scrollSepolia avalancheFuji

for %%n in (%networks%) do (
  echo.
  echo ==========================================
  echo Funding %%n...
  echo ==========================================
  
  call npx hardhat run scripts/fund-treasuries.ts --network %%n
  
  if errorlevel 1 (
    echo X Failed to fund %%n
  ) else (
    echo √ Successfully funded %%n
  )
  
  timeout /t 2 /nobreak >nul
)

echo.
echo ==========================================
echo FUNDING COMPLETE
echo ==========================================
