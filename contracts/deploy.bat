@echo off
REM GasStation Deployment Script for Coston2 (Windows)

echo ========================================================================
echo GasStation Deployment to Coston2
echo ========================================================================
echo.

REM Check if PRIVATE_KEY is set
if "%PRIVATE_KEY%"=="" (
    echo ERROR: PRIVATE_KEY environment variable is not set
    echo.
    echo Please set your private key:
    echo   set PRIVATE_KEY=0x...
    echo.
    echo Or create a .env file in the contracts directory with:
    echo   PRIVATE_KEY=0x...
    echo.
    exit /b 1
)

echo PRIVATE_KEY is set
echo.

REM Check prerequisites
echo Step 1: Checking deployment prerequisites...
call npx hardhat run scripts/check-deployment-ready.ts --network coston2

if errorlevel 1 (
    echo.
    echo Prerequisites check failed
    echo.
    echo Please:
    echo   1. Get C2FLR tokens from: https://faucet.flare.network/
    echo   2. Wait for tokens to arrive (usually takes 1-2 minutes^)
    echo   3. Run this script again
    echo.
    exit /b 1
)

echo.
echo Step 2: Compiling contracts...
call npm run compile

if errorlevel 1 (
    echo.
    echo Compilation failed
    exit /b 1
)

echo.
echo Step 3: Deploying to Coston2...
echo.
call npx hardhat run scripts/deploy-coston2.ts --network coston2

if errorlevel 1 (
    echo.
    echo Deployment failed
    exit /b 1
)

echo.
echo ========================================================================
echo DEPLOYMENT COMPLETE
echo ========================================================================
echo.
echo Next steps:
echo   1. Copy the contract addresses from above
echo   2. Update backend/.env.flare.local with the addresses
echo   3. Test the deployment with the frontend
echo.
