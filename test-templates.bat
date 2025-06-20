@echo off
setlocal EnableDelayedExpansion

echo ==========================================
echo CRITERION TEMPLATES CHECKER
echo ==========================================
echo.

set "CRITERION_PATH=C:\Users\%USERNAME%\AppData\Local\Programs\Criterion"
set "PRESERVED_PATH=C:\Users\%USERNAME%\AppData\Roaming\Criterion\preserved-templates"

echo Checking for Criterion installation...
if exist "!CRITERION_PATH!" (
    echo Criterion found in: !CRITERION_PATH!
) else (
    echo Criterion not found in: !CRITERION_PATH!
    goto :CreateTestTemplates
)

echo.
echo Checking for templates in current installation...
if exist "!CRITERION_PATH!\resources\buildResources\templates\" (
    echo Templates directory exists: !CRITERION_PATH!\resources\buildResources\templates\
    dir /B "!CRITERION_PATH!\resources\buildResources\templates\" 2>nul | findstr . >nul
    if !errorlevel! equ 0 (
        echo Templates found:
        dir /B "!CRITERION_PATH!\resources\buildResources\templates\"
    ) else (
        echo No templates in: !CRITERION_PATH!\resources\buildResources\templates\
        goto :CreateTestTemplates
    )
) else (
    echo Templates directory not found: !CRITERION_PATH!\resources\buildResources\templates\
    goto :CreateTestTemplates
)

echo.
echo Checking for templates in old location...
if exist "!CRITERION_PATH!\buildResources\templates\" (
    echo Templates directory exists: !CRITERION_PATH!\buildResources\templates\
    dir /B "!CRITERION_PATH!\buildResources\templates\" 2>nul | findstr . >nul
    if !errorlevel! equ 0 (
        echo Old location templates found:
        dir /B "!CRITERION_PATH!\buildResources\templates\"
    ) else (
        echo No templates in old location
    )
) else (
    echo Old templates directory not found: !CRITERION_PATH!\buildResources\templates\
)

echo.
echo Checking for preserved templates...
if exist "!PRESERVED_PATH!\" (
    echo Preserved templates directory exists: !PRESERVED_PATH!\
    dir /B "!PRESERVED_PATH!\" 2>nul | findstr . >nul
    if !errorlevel! equ 0 (
        echo Preserved templates found:
        dir /B "!PRESERVED_PATH!\"
        echo.
        echo Content of first preserved template:
        for /f %%i in ('dir /B "!PRESERVED_PATH!\" ^| findstr .') do (
            echo --- Content of %%i ---
            type "!PRESERVED_PATH!\%%i" 2>nul
            goto :EndTemplateCheck
        )
        :EndTemplateCheck
    ) else (
        echo No preserved templates in: !PRESERVED_PATH!\
    )
) else (
    echo No preserved templates directory: !PRESERVED_PATH!\
)

goto :EndScript

:CreateTestTemplates
echo.
echo ==========================================
echo CREATING TEST TEMPLATES
echo ==========================================
echo.

echo Creating test templates directory...
if not exist "!CRITERION_PATH!\resources\buildResources\templates\" (
    mkdir "!CRITERION_PATH!\resources\buildResources\templates\" 2>nul
    if !errorlevel! equ 0 (
        echo Directory created successfully
    ) else (
        echo Failed to create directory - you may need administrator rights
        goto :ManualInstructions
    )
) else (
    echo Directory already exists
)

echo Creating test template files...
echo Template di test creato da script batch > "!CRITERION_PATH!\resources\buildResources\templates\test-template.tml" 2>nul
if !errorlevel! equ 0 (
    echo test-template.tml created
) else (
    echo Failed to create test-template.tml
)

echo Template blank creato automaticamente > "!CRITERION_PATH!\resources\buildResources\templates\blank-auto.tml" 2>nul
if !errorlevel! equ 0 (
    echo blank-auto.tml created
) else (
    echo Failed to create blank-auto.tml
)

echo Test XML template^<template^>^<title^>Test^</title^>^</template^> > "!CRITERION_PATH!\resources\buildResources\templates\test.xml" 2>nul
if !errorlevel! equ 0 (
    echo test.xml created
) else (
    echo Failed to create test.xml
)

echo.
echo Test templates created! Now:
echo 1. Run the uninstaller to test preservation
echo 2. Check if templates are preserved in: !PRESERVED_PATH!
echo 3. Reinstall to test restoration
goto :EndScript

:ManualInstructions
echo.
echo ==========================================
echo MANUAL TEMPLATE CREATION
echo ==========================================
echo.
echo To create test templates manually, run these commands as administrator:
echo.
echo mkdir "!CRITERION_PATH!\resources\buildResources\templates"
echo echo Test Template ^> "!CRITERION_PATH!\resources\buildResources\templates\test-template.tml"
echo echo Blank Template ^> "!CRITERION_PATH!\resources\buildResources\templates\blank.tml"

:EndScript
echo.
echo ==========================================
echo TESTING INSTRUCTIONS
echo ==========================================
echo.
echo 1. Make sure templates exist in the installation directory
echo 2. Run the uninstaller 
echo 3. Check if templates are preserved in %APPDATA%\Criterion\preserved-templates
echo 4. Reinstall to verify templates are restored
echo.
echo If templates are not preserved, check the uninstaller logs for error messages
echo ==========================================
echo.
echo Premere un tasto per continuare . . .
pause >nul 