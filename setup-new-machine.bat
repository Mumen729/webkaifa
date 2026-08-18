@echo off
chcp 65001 >nul
title Atlas - New Machine Setup
echo ==================================================
echo   Atlas 新闻网站 - 新电脑一键安装脚本
echo ==================================================
echo.

REM --- check Node.js ---
where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js
  echo   请先安装 Node.js 22.5 或更高版本: https://nodejs.org
  echo   安装时一路 Next 即可。
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do set NODEV=%%v
echo [OK] Node.js %NODEV%

REM --- check Git ---
where git >nul 2>nul
if errorlevel 1 (
  echo [提示] 未检测到 Git。请用"Download ZIP"方式获取项目，
  echo       或先安装 Git: https://git-scm.com/download/win
)

REM --- get the project ---
if exist "D:\webkaifa\package.json" (
  echo [OK] 项目已存在于 D:\webkaifa，跳过克隆
) else (
  where git >nul 2>nul
  if not errorlevel 1 (
    echo 正在从 GitHub 克隆项目到 D:\webkaifa ...
    echo (若弹出 GitHub 登录窗口，请完成授权)
    git clone https://github.com/Mumen729/webkaifa.git D:\webkaifa
    if errorlevel 1 (
      echo [错误] 克隆失败。可能原因：网络/代理问题。
      echo   解决办法：先执行  set NO_PROXY=github.com,api.github.com  再重试。
      pause
      exit /b 1
    )
  ) else (
    echo [错误] 需要先获取项目文件：
    echo   1. 浏览器打开 https://github.com/Mumen729/webkaifa
    echo   2. 点绿色 Code 按钮 -> Download ZIP
    echo   3. 解压后把文件夹改名为 webkaifa 放到 D:\ 下
    pause
    exit /b 1
  )
)

cd /d D:\webkaifa

echo.
echo 正在安装依赖（需要 1~3 分钟，请耐心等待）...
call npm install --no-audit --no-fund
if errorlevel 1 ( echo [错误] 根依赖安装失败 & pause & exit /b 1 )
call npm --prefix server install --no-audit --no-fund
if errorlevel 1 ( echo [错误] 后端依赖安装失败 & pause & exit /b 1 )
call npm --prefix client install --no-audit --no-fund
if errorlevel 1 ( echo [错误] 前端依赖安装失败 & pause & exit /b 1 )

echo.
echo ==================================================
echo   安装完成!
echo ==================================================
echo.
echo   以后每次启动网站（两个服务会同时起）:
echo       cd /d D:\webkaifa
echo       npm run dev
echo.
echo   然后浏览器打开:
echo       前台: http://localhost:5173
echo       后台: http://localhost:5173/admin   (账号 admin / 密码 admin123)
echo.
pause
