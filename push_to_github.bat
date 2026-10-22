@echo off
title Push to GitHub
cd /d "%~dp0"

set GIT="C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe"
if not exist %GIT% (
    set GIT=git
)

echo ====================================================
echo Push Bookshelf Project to GitHub
echo ====================================================
echo.
set /p REPO_URL="Paste your GitHub repository URL (e.g. https://github.com/username/bookshelf.git): "
if "%REPO_URL%"=="" (
    echo [!] No repository URL entered. Exiting.
    pause
    exit /b
)

echo.
echo Configuring remote origin...
%GIT% remote remove origin 2>nul
%GIT% remote add origin %REPO_URL%

echo Pushing to GitHub (main branch)...
%GIT% branch -M main
%GIT% push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo ====================================================
    echo [OK] Successfully pushed to GitHub!
    echo ====================================================
) else (
    echo [!] Push failed. Please check the URL and your GitHub permissions.
)
echo.
pause
