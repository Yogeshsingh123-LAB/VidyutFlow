@echo off
setlocal enabledelayedexpansion

REM Ensure script always executes in the repository root directory
cd /d "%~dp0"

REM Banner
echo ======================================================================
echo                     VidyutFlow Application Launcher
echo ======================================================================

REM ----------------------------------------------------------------------
REM 1. Environment & Dependency Detection
REM ----------------------------------------------------------------------

REM Detect Python executable (venv or system python)
set "PYTHON_CMD="
if exist "%~dp0.venv\Scripts\python.exe" (
    set "PYTHON_CMD=%~dp0.venv\Scripts\python.exe"
) else if exist "%~dp0venv\Scripts\python.exe" (
    set "PYTHON_CMD=%~dp0venv\Scripts\python.exe"
) else if exist "%~dp0backend\.venv\Scripts\python.exe" (
    set "PYTHON_CMD=%~dp0backend\.venv\Scripts\python.exe"
) else if exist "%~dp0backend\venv\Scripts\python.exe" (
    set "PYTHON_CMD=%~dp0backend\venv\Scripts\python.exe"
) else (
    where python >nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_CMD=python"
    ) else (
        where py >nul 2>&1
        if not errorlevel 1 (
            set "PYTHON_CMD=py -3"
        )
    )
)

REM Detect host port availability for Backend (avoid collision with IncrediBuild/IIS/other host services)
set "BACKEND_PORT=8000"
if not "%PYTHON_CMD%"=="" (
    if exist "%~dp0scripts\find_port.py" (
        for /f %%P in ('%PYTHON_CMD% "%~dp0scripts\find_port.py"') do (
            set "BACKEND_PORT=%%P"
        )
    )
)
if not "!BACKEND_PORT!"=="8000" (
    echo [INFO] Host port 8000 is occupied by a background system service [e.g. IncrediBuild].
    echo [INFO] Re-routing host Backend port to !BACKEND_PORT! to prevent conflicts.
)

REM Check and initialize root .env if missing
if not exist ".env" (
    echo [INFO] .env not found. Initializing from .env.example...
    if exist ".env.example" (
        copy /y ".env.example" ".env" >nul
        REM Generate a secure 64-character hex secret for SECRET_KEY and SESSION_SECRET
        powershell -NoProfile -Command "$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create(); $b1 = New-Object byte[] 32; $rng.GetBytes($b1); $k1 = ($b1 | ForEach-Object { '{0:x2}' -f $_ }) -join ''; $b2 = New-Object byte[] 32; $rng.GetBytes($b2); $k2 = ($b2 | ForEach-Object { '{0:x2}' -f $_ }) -join ''; $content = Get-Content '.env'; $content = $content -replace '^SECRET_KEY=.*', ('SECRET_KEY=' + $k1); $content = $content -replace '^SESSION_SECRET=.*', ('SESSION_SECRET=' + $k2); $content | Set-Content '.env'"
        echo [INFO] Created .env with freshly generated cryptographically secure secret keys.
    ) else (
        echo [WARNING] .env.example not found. Please ensure environment variables are configured.
    )
)

REM Check and initialize backend .env if missing
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy /y "backend\.env.example" "backend\.env" >nul
    )
)

REM ----------------------------------------------------------------------
REM 2. Command Routing & Auto-Detection
REM ----------------------------------------------------------------------
set "CMD=%~1"

REM If no command provided, auto-detect best launch mode
if "%CMD%"=="" (
    docker info >nul 2>&1
    if not errorlevel 1 (
        echo [INFO] Docker daemon is running. Launching full stack via Docker Compose...
        goto :cmd_up
    ) else (
        echo [INFO] Docker daemon is not active. Auto-selecting local development mode...
        echo [INFO] Note: Start Docker Desktop and run 'run.bat up' to use Docker Compose.
        echo.
        goto :cmd_dev
    )
)

if /i "%CMD%"=="up" goto :cmd_up
if /i "%CMD%"=="compose" goto :cmd_up
if /i "%CMD%"=="docker" goto :cmd_up
if /i "%CMD%"=="down" goto :cmd_down
if /i "%CMD%"=="stop" goto :cmd_down
if /i "%CMD%"=="restart" goto :cmd_restart
if /i "%CMD%"=="status" goto :cmd_status
if /i "%CMD%"=="ps" goto :cmd_status
if /i "%CMD%"=="logs" goto :cmd_logs
if /i "%CMD%"=="verify" goto :cmd_verify
if /i "%CMD%"=="smoke" goto :cmd_verify
if /i "%CMD%"=="dev" goto :cmd_dev
if /i "%CMD%"=="local" goto :cmd_dev
if /i "%CMD%"=="backend" goto :cmd_backend
if /i "%CMD%"=="frontend" goto :cmd_frontend
if /i "%CMD%"=="setup" goto :cmd_setup
if /i "%CMD%"=="train" goto :cmd_train
if /i "%CMD%"=="build" goto :cmd_build
if /i "%CMD%"=="test" goto :cmd_test
if /i "%CMD%"=="reset" goto :cmd_reset
if /i "%CMD%"=="demo-reset" goto :cmd_reset
if /i "%CMD%"=="clean" goto :cmd_clean
if /i "%CMD%"=="help" goto :cmd_help
if /i "%CMD%"=="/?" goto :cmd_help
if /i "%CMD%"=="-h" goto :cmd_help
if /i "%CMD%"=="--help" goto :cmd_help

echo [ERROR] Unknown option: %CMD%
echo.
goto :cmd_help

REM ----------------------------------------------------------------------
REM 3. Command Implementations
REM ----------------------------------------------------------------------

:cmd_up
echo [INFO] Verifying Docker daemon status...
docker info >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Docker daemon is not responding or Docker Desktop is not running.
    echo.
    echo Would you like to run locally without Docker instead?
    set /p "RUN_DEV=[Y/n]: "
    if "!RUN_DEV!"=="" set "RUN_DEV=Y"
    if /i "!RUN_DEV!"=="Y" goto :cmd_dev
    if /i "!RUN_DEV!"=="YES" goto :cmd_dev
    echo.
    echo Please start Docker Desktop and re-run: run.bat up
    exit /b 1
)

echo [INFO] Starting VidyutFlow full stack with Docker Compose...
echo   - Frontend:   http://localhost:5173
echo   - Backend:    http://localhost:!BACKEND_PORT!
echo   - API Docs:   http://localhost:!BACKEND_PORT!/docs
echo   - PostgreSQL: 5432 ^| Redis: 6379
echo.
echo Press Ctrl+C in this terminal to stop the stack.
echo ----------------------------------------------------------------------
docker compose up --build
goto :end

:cmd_down
echo [INFO] Stopping all VidyutFlow Docker Compose services...
docker compose down
goto :end

:cmd_restart
echo [INFO] Restarting VidyutFlow Docker Compose services...
docker compose restart
goto :end

:cmd_status
echo [INFO] Docker Compose services status:
docker compose ps
goto :end

:cmd_logs
echo [INFO] Streaming logs (press Ctrl+C to exit)...
docker compose logs -f %2 %3 %4
goto :end

:cmd_verify
echo [INFO] Running automated end-to-end integration smoke verification...
if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python not found. Please install Python 3.10+ and add it to PATH.
    exit /b 1
)
"%PYTHON_CMD%" scripts/verify_compose.py %2 %3 %4
goto :end

:cmd_dev
echo [INFO] Launching local development environment (without Docker)...

if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python not found. Please install Python 3.10+ and add it to PATH.
    exit /b 1
)

REM Verify frontend dependencies exist at repo root
if not exist "%~dp0node_modules" (
    echo [INFO] Root node_modules missing. Installing dependencies...
    cd /d "%~dp0"
    call npm install
)

REM Prepare environment variables for local execution
set "DATABASE_URL=sqlite:///./vidyutflow.db"
set "CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
set "VITE_PROXY_TARGET=http://127.0.0.1:!BACKEND_PORT!"

echo [INFO] Starting FastAPI backend on http://127.0.0.1:!BACKEND_PORT!...
start "VidyutFlow Backend (:!BACKEND_PORT!)" /D "%~dp0backend" cmd /k "set DATABASE_URL=sqlite:///./vidyutflow.db&& set CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000&& %PYTHON_CMD% -m uvicorn app.main:app --reload --host 127.0.0.1 --port !BACKEND_PORT!"

echo [INFO] Starting Vite frontend on http://localhost:3000...
start "VidyutFlow Frontend (:3000)" /D "%~dp0" cmd /k "set VITE_PROXY_TARGET=http://127.0.0.1:!BACKEND_PORT!&& npm run dev"

echo.
echo ======================================================================
echo [SUCCESS] VidyutFlow started in separate terminal windows!
echo   - Web UI:    http://localhost:3000 (or http://localhost:5173)
echo   - Backend:   http://127.0.0.1:!BACKEND_PORT!
echo   - API Docs:  http://127.0.0.1:!BACKEND_PORT!/docs
echo   - Database:  SQLite (local fallback: backend/vidyutflow.db)
echo ======================================================================
echo.
goto :end

:cmd_backend
echo [INFO] Starting FastAPI backend in current window...
if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python not found. Please install Python 3.10+ and add it to PATH.
    exit /b 1
)
cd /d "%~dp0backend"
set "DATABASE_URL=sqlite:///./vidyutflow.db"
set "CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
"%PYTHON_CMD%" -m uvicorn app.main:app --reload --host 127.0.0.1 --port !BACKEND_PORT!
goto :end

:cmd_frontend
echo [INFO] Starting Vite frontend in current window...
cd /d "%~dp0"
set "VITE_PROXY_TARGET=http://127.0.0.1:!BACKEND_PORT!"
call npm run dev
goto :end

:cmd_setup
echo [INFO] Installing backend dependencies...
if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python not found. Please install Python 3.10+ and add it to PATH.
    exit /b 1
)
cd /d "%~dp0backend"
"%PYTHON_CMD%" -m pip install -r requirements.txt -r requirements-dev.txt
echo.
echo [INFO] Installing frontend dependencies...
cd /d "%~dp0"
call npm install
echo.
echo [SUCCESS] All dependencies installed successfully.
goto :end

:cmd_train
echo [INFO] Retraining ML models on synthetic data...
if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python not found. Please install Python 3.10+ and add it to PATH.
    exit /b 1
)
cd /d "%~dp0backend"
"%PYTHON_CMD%" scripts/train_models.py
cd /d "%~dp0"
echo [SUCCESS] Model training complete.
goto :end

:cmd_build
echo [INFO] Building production frontend bundle...
cd /d "%~dp0"
call npm run build
echo [SUCCESS] Frontend production build created in dist.
goto :end

:cmd_test
echo [INFO] Running backend and frontend test suites...
if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python not found. Please install Python 3.10+ and add it to PATH.
    exit /b 1
)
set "TEST_FAILED=0"

echo.
echo [INFO] 1/2 Running backend test suite...
cd /d "%~dp0backend"
set "DATABASE_URL=sqlite:///./test_vidyutos.db"
"%PYTHON_CMD%" -m pytest -q
if errorlevel 1 (
    echo [WARNING] Backend tests reported failures.
    set "TEST_FAILED=1"
) else (
    echo [SUCCESS] Backend test suite passed.
)

echo.
echo [INFO] 2/2 Running frontend test suite...
cd /d "%~dp0"
call npm test
if errorlevel 1 (
    echo [WARNING] Frontend tests reported failures.
    set "TEST_FAILED=1"
) else (
    echo [SUCCESS] Frontend test suite passed.
)

if "%TEST_FAILED%"=="1" (
    echo.
    echo [WARNING] One or more test suites failed.
    exit /b 1
) else (
    echo.
    echo [SUCCESS] All test suites passed!
)
goto :end

:cmd_reset
echo [INFO] Resetting local SQLite demo databases...
if exist "backend\vidyutflow.db" del /f /q "backend\vidyutflow.db" 2>nul
if exist "vidyutflow.db" del /f /q "vidyutflow.db" 2>nul
if exist "backend\vidyutos.db" del /f /q "backend\vidyutos.db" 2>nul
if exist "vidyutos.db" del /f /q "vidyutos.db" 2>nul
if exist "backend\test_vidyutos.db" del /f /q "backend\test_vidyutos.db" 2>nul
if exist "test_vidyutos.db" del /f /q "test_vidyutos.db" 2>nul
echo [SUCCESS] Demo SQLite databases removed.
echo Fresh demo data will be seeded automatically on next backend launch.
goto :end

:cmd_clean
call :cmd_reset
echo [INFO] Cleaning build artifacts and cache directories...
if exist "dist" rmdir /s /q "dist" 2>nul
if exist "public\vendor\tesseract" rmdir /s /q "public\vendor\tesseract" 2>nul
if exist "backend\.pytest_cache" rmdir /s /q "backend\.pytest_cache" 2>nul
if exist ".pytest_cache" rmdir /s /q ".pytest_cache" 2>nul
echo [SUCCESS] Clean completed.
goto :end

:cmd_help
echo Usage: run.bat [command]
echo.
echo Commands:
echo   run.bat                 Auto-start (Compose if Docker running, else local dev)
echo   run.bat dev             Run locally without Docker (starts backend ^& frontend)
echo   run.bat backend         Run FastAPI backend only (SQLite fallback on :!BACKEND_PORT!)
echo   run.bat frontend        Run Vite frontend only (on :3000)
echo   run.bat up              Start complete stack via Docker Compose
echo   run.bat down            Stop and remove containers
echo   run.bat restart         Restart running containers
echo   run.bat status          Check container health and port bindings
echo   run.bat logs [svc]      Tail container logs (e.g., run.bat logs backend)
echo   run.bat verify          Run automated smoke integration verification test
echo   run.bat setup           Install Python and npm dependencies
echo   run.bat train           Retrain ML models on synthetic data
echo   run.bat build           Build production frontend bundle
echo   run.bat test            Run backend and frontend automated test suites
echo   run.bat reset           Reset local demo SQLite database
echo   run.bat clean           Reset demo DB and remove build/cache artifacts
echo   run.bat help            Show this help reference
echo.
goto :end

:end
endlocal
