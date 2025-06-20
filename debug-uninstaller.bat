@echo off
setlocal EnableDelayedExpansion

echo ==========================================
echo CRITERION UNINSTALLER DEBUG
echo ==========================================
echo.

set "CRITERION_PATH=C:\Users\%USERNAME%\AppData\Local\Programs\Criterion"
set "PRESERVED_PATH=C:\Users\%USERNAME%\AppData\Roaming\Criterion\preserved-templates"
set "UNINSTALLER_PATH=!CRITERION_PATH!\Uninstall Criterion.exe"

echo Checking for Criterion installation...
if exist "!CRITERION_PATH!" (
    echo Criterion found in: !CRITERION_PATH!
) else (
    echo Criterion not found in: !CRITERION_PATH!
    goto :EndScript
)

echo.
echo Checking for uninstaller...
if exist "!UNINSTALLER_PATH!" (
    echo Uninstaller found: !UNINSTALLER_PATH!
) else (
    echo Uninstaller not found: !UNINSTALLER_PATH!
    goto :EndScript
)

echo.
echo Checking current templates...
if exist "!CRITERION_PATH!\resources\buildResources\templates\" (
    echo Templates directory exists
    dir /B "!CRITERION_PATH!\resources\buildResources\templates\" 2>nul | findstr . >nul
    if !errorlevel! equ 0 (
        echo Templates found:
        dir /B "!CRITERION_PATH!\resources\buildResources\templates\"
    ) else (
        echo No templates found
        goto :NoTemplates
    )
) else (
    echo Templates directory not found
    goto :NoTemplates
)

echo.
echo ==========================================
echo RUNNING UNINSTALLER WITH DEBUG
echo ==========================================
echo.
echo This will run the uninstaller with verbose logging.
echo The uninstaller will show detailed output about template preservation.
echo.
echo Make sure to watch for these messages:
echo - "UNINSTALLER: Starting template preservation process..."
echo - "Templates preserved to: ..."
echo - "Template preservation verified - files found in preserved-templates"
echo.
pause

echo Running uninstaller with verbose output...
"!UNINSTALLER_PATH!" /S

echo.
echo ==========================================
echo CHECKING RESULTS
echo ==========================================
echo.

echo Checking if templates were preserved...
if exist "!PRESERVED_PATH!\" (
    echo SUCCESS: Preserved templates directory exists: !PRESERVED_PATH!
    dir /B "!PRESERVED_PATH!\" 2>nul | findstr . >nul
    if !errorlevel! equ 0 (
        echo SUCCESS: Preserved templates found:
        dir /B "!PRESERVED_PATH!\"
        echo.
        echo Content check:
        for /f %%i in ('dir /B "!PRESERVED_PATH!\" ^| findstr .') do (
            echo --- %%i ---
            type "!PRESERVED_PATH!\%%i" 2>nul
            echo.
        )
    ) else (
        echo WARNING: Preserved templates directory exists but is empty
    )
) else (
    echo ERROR: No preserved templates directory found
)

echo.
echo Checking if Criterion was actually uninstalled...
if exist "!CRITERION_PATH!" (
    echo WARNING: Criterion directory still exists - uninstallation may have failed
) else (
    echo SUCCESS: Criterion was successfully uninstalled
)

goto :EndScript

:NoTemplates
echo.
echo No templates found to preserve. 
echo Run test-templates.bat first to create test templates.

:EndScript
echo.
echo ==========================================
echo DEBUG COMPLETED
echo ==========================================
echo.
pause 