# Include librerie necessarie per dialog e checkbox
!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "WinMessages.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"  # Aggiunta per funzioni avanzate di gestione file

# NOTA: Le lingue supportate sono definite in electron-builder.json
# con le proprietà "language" e "installerLanguages" limitate a:
# - Italiano (it-IT)
# - Inglese (en-US)
# - Spagnolo (es-ES)
# - Francese (fr-FR)
# - Tedesco (de-DE)

# Definizione delle stringhe localizzate
!define OPTION_PAGE_TITLE_IT "Opzioni di installazione"
!define OPTION_PAGE_SUBTITLE_IT "Personalizza le opzioni di installazione"
!define KEEP_DATA_IT "Mantieni i dati e le impostazioni dell'applicazione"
!define SELECT_LANG_IT "Seleziona la lingua dell'applicazione:"
!define RUN_AFTER_INSTALL_IT "Avvia Criterion dopo l'installazione"
!define CLOSE_BUTTON_IT "Chiudi"
!define UNINSTALL_CONFIRM_IT "Sei sicuro di voler disinstallare Criterion?"
!define UNINSTALL_COMPLETE_IT "Disinstallazione completata"
!define PRESERVING_TEMPLATES_IT "Conservazione dei template utente..."
!define RESTORING_TEMPLATES_IT "Ripristino dei template utente..."

!define OPTION_PAGE_TITLE_EN "Installation Options"
!define OPTION_PAGE_SUBTITLE_EN "Customize installation options"
!define KEEP_DATA_EN "Keep application data and settings"
!define SELECT_LANG_EN "Select application language:"
!define RUN_AFTER_INSTALL_EN "Launch Criterion after installation"
!define CLOSE_BUTTON_EN "Close"
!define UNINSTALL_CONFIRM_EN "Are you sure you want to uninstall Criterion?"
!define UNINSTALL_COMPLETE_EN "Uninstallation completed"
!define PRESERVING_TEMPLATES_EN "Preserving user templates..."
!define RESTORING_TEMPLATES_EN "Restoring user templates..."

!define OPTION_PAGE_TITLE_FR "Options d'installation"
!define OPTION_PAGE_SUBTITLE_FR "Personnaliser les options d'installation"
!define KEEP_DATA_FR "Conserver les données et les paramètres de l'application"
!define SELECT_LANG_FR "Sélectionner la langue de l'application:"
!define RUN_AFTER_INSTALL_FR "Lancer Criterion après l'installation"
!define CLOSE_BUTTON_FR "Fermer"
!define UNINSTALL_CONFIRM_FR "Êtes-vous sûr de vouloir désinstaller Criterion?"
!define UNINSTALL_COMPLETE_FR "Désinstallation terminée"
!define PRESERVING_TEMPLATES_FR "Conservation des modèles utilisateur..."
!define RESTORING_TEMPLATES_FR "Restauration des modèles utilisateur..."

!define OPTION_PAGE_TITLE_ES "Opciones de instalación"
!define OPTION_PAGE_SUBTITLE_ES "Personaliza las opciones de instalación"
!define KEEP_DATA_ES "Mantener dati e configurazione dell'applicazione"
!define SELECT_LANG_ES "Seleccionar idioma de la aplicación:"
!define RUN_AFTER_INSTALL_ES "Iniciar Criterion después de la instalación"
!define CLOSE_BUTTON_ES "Cerrar"
!define UNINSTALL_CONFIRM_ES "¿Estás seguro de que quieres desinstalar Criterion?"
!define UNINSTALL_COMPLETE_ES "Desinstalación completada"
!define PRESERVING_TEMPLATES_ES "Conservando plantillas de usuario..."
!define RESTORING_TEMPLATES_ES "Restaurando plantillas de usuario..."

!define OPTION_PAGE_TITLE_DE "Installationsoptionen"
!define OPTION_PAGE_SUBTITLE_DE "Installationsoptionen anpassen"
!define KEEP_DATA_DE "Anwendungsdaten und Einstellungen beibehalten"
!define SELECT_LANG_DE "Sprache der Anwendung auswählen:"
!define RUN_AFTER_INSTALL_DE "Criterion nach der Installation starten"
!define CLOSE_BUTTON_DE "Schließen"
!define UNINSTALL_CONFIRM_DE "Sind Sie sicher, dass Sie Criterion deinstallieren möchten?"
!define UNINSTALL_COMPLETE_DE "Deinstallation abgeschlossen"
!define PRESERVING_TEMPLATES_DE "Benutzervorlagen werden bewahrt..."
!define RESTORING_TEMPLATES_DE "Benutzervorlagen werden wiederhergestellt..."

# Impostazioni per la selezione della lingua
!define MUI_LANGDLL_REGISTRY_ROOT "HKCU"
!define MUI_LANGDLL_REGISTRY_KEY "Software\Criterion"
!define MUI_LANGDLL_REGISTRY_VALUENAME "Installer Language"
!define MUI_LANGDLL_ALWAYSSHOW
!define MUI_LANGDLL_WINDOWTITLE "Seleziona lingua | Select language"
!define MUI_LANGDLL_INFO "Seleziona la lingua dell'installazione | Select installer language"

# Definizioni per la pagina finale dell'installatore
!define MUI_FINISHPAGE_RUN "$INSTDIR\Criterion.exe"
!define MUI_FINISHPAGE_RUN_CHECKED
!define MUI_FINISHPAGE_RUN_FUNCTION "RunApplicationAndExit"
!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_FINISHPAGE_NOREBOOTSUPPORT
!define MUI_FINISHPAGE_SHOWREADME ""
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
!define MUI_FINISHPAGE_SHOWREADME_FUNCTION ExitInstaller
# Il pulsante sarà impostato dinamicamente
!define MUI_PAGE_CUSTOMFUNCTION_PRE FinishPagePre
!define MUI_PAGE_CUSTOMFUNCTION_SHOW FinishPageShow
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE FinishPageLeave
!define MUI_FINISHPAGE_LINK "www.finconsgroup.com"
!define MUI_FINISHPAGE_LINK_LOCATION "https://www.finconsgroup.com"

# Definizioni per la pagina di elaborazione dell'uninstaller  
!define MUI_UNPAGE_INSTFILES_SHOW un.InstfilesPageShow

# Definizione dell'ordine delle pagine dell'installatore
!insertmacro MUI_PAGE_WELCOME
!ifdef EULA
  !insertmacro MUI_PAGE_LICENSE "${EULA}"
!else
  !ifdef PROJECT_DIR
    !insertmacro MUI_PAGE_LICENSE "${PROJECT_DIR}\LICENSE"
  !else
    !insertmacro MUI_PAGE_LICENSE "$INSTDIR\LICENSE"
  !endif
!endif
Page custom OptionsPageCreate OptionsPageLeave
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

# Definizione delle pagine dell'uninstaller
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
UninstPage custom un.CustomFinishPageCreate un.CustomFinishPageLeave

# IMPORTANTE: NON inserire MUI_LANGUAGE qui, electron-builder gestisce già le lingue

Var KEEP_CONFIG
Var APP_ALREADY_INSTALLED
Var Dialog
Var KeepDataCheckbox
Var KeepDataState
Var INSTALL_EXECUTED
Var INSTALLER_COMPLETED
Var INSTALLER_CLOSING
Var LanguageDropList
Var SelectedLanguage
Var InstallerLanguage
Var LocalizedOptionTitle
Var LocalizedOptionSubtitle
Var LocalizedKeepData
Var LocalizedSelectLang
Var LocalizedRunText
Var LocalizedCloseButton
Var LocalizedPreservingTemplates
Var LocalizedRestoringTemplates

# Variabili per l'uninstaller
Var UNINSTALL_EXECUTED
Var UNINSTALLER_COMPLETED
Var UNINSTALLER_CLOSING

Function ExitInstaller
  SetErrorLevel 0
  SetAutoClose true
  StrCpy $INSTALLER_CLOSING "1"
  Quit
FunctionEnd

Function FinishPagePre
  # Imposta dinamicamente il testo del pulsante chiudi
  !ifdef MUI_FINISHPAGE_BUTTON
    !undef MUI_FINISHPAGE_BUTTON
  !endif
  !define MUI_FINISHPAGE_BUTTON "$LocalizedCloseButton"
FunctionEnd

Function FinishPageShow
  # Aggiorna il testo del pulsante "Run" nella pagina finale in base alla lingua
  Call GetLocalizedStrings
  
  # Aggiorna il testo del pulsante nella pagina finale
  FindWindow $0 "#32770" "" $HWNDPARENT
  GetDlgItem $0 $0 1203 # ID del checkbox "Launch"
  SendMessage $0 ${WM_SETTEXT} 0 "STR:$LocalizedRunText"
  
  # Aggiorna anche il pulsante Chiudi
  GetDlgItem $0 $HWNDPARENT 2 # ID del pulsante Close/Chiudi
  SendMessage $0 ${WM_SETTEXT} 0 "STR:$LocalizedCloseButton"
  
  StrCpy $INSTALLER_COMPLETED "1"
FunctionEnd

Function FinishPageLeave
  StrCpy $INSTALLER_CLOSING "1"
FunctionEnd

Function RunApplicationAndExit
  ExecShell "" "$INSTDIR\Criterion.exe"
  StrCpy $INSTALLER_CLOSING "1"
  SetErrorLevel 0
  Quit
FunctionEnd

Function .onGUIEnd
  ${If} $INSTALLER_CLOSING != "1"
    StrCpy $INSTALLER_CLOSING "1"
    Quit
  ${EndIf}
FunctionEnd

Function .onInstSuccess
  StrCpy $INSTALLER_COMPLETED "1"
  ClearErrors
FunctionEnd

# Aggiornamento delle stringhe localizzate in base alla lingua corrente
Function GetLocalizedStrings
  ${If} $LANGUAGE == 1040 # LANG_ITALIAN
    StrCpy $SelectedLanguage "it"
    StrCpy $InstallerLanguage "0"
    StrCpy $LocalizedOptionTitle "${OPTION_PAGE_TITLE_IT}"
    StrCpy $LocalizedOptionSubtitle "${OPTION_PAGE_SUBTITLE_IT}"
    StrCpy $LocalizedKeepData "${KEEP_DATA_IT}"
    StrCpy $LocalizedSelectLang "${SELECT_LANG_IT}"
    StrCpy $LocalizedRunText "${RUN_AFTER_INSTALL_IT}"
    StrCpy $LocalizedCloseButton "${CLOSE_BUTTON_IT}"
    StrCpy $LocalizedPreservingTemplates "${PRESERVING_TEMPLATES_IT}"
    StrCpy $LocalizedRestoringTemplates "${RESTORING_TEMPLATES_IT}"
  ${ElseIf} $LANGUAGE == 1033 # LANG_ENGLISH_US
    StrCpy $SelectedLanguage "en"
    StrCpy $InstallerLanguage "1"
    StrCpy $LocalizedOptionTitle "${OPTION_PAGE_TITLE_EN}"
    StrCpy $LocalizedOptionSubtitle "${OPTION_PAGE_SUBTITLE_EN}"
    StrCpy $LocalizedKeepData "${KEEP_DATA_EN}"
    StrCpy $LocalizedSelectLang "${SELECT_LANG_EN}"
    StrCpy $LocalizedRunText "${RUN_AFTER_INSTALL_EN}"
    StrCpy $LocalizedCloseButton "${CLOSE_BUTTON_EN}"
    StrCpy $LocalizedPreservingTemplates "${PRESERVING_TEMPLATES_EN}"
    StrCpy $LocalizedRestoringTemplates "${RESTORING_TEMPLATES_EN}"
  ${ElseIf} $LANGUAGE == 2057 # LANG_ENGLISH_UK
    StrCpy $SelectedLanguage "en"
    StrCpy $InstallerLanguage "1"
    StrCpy $LocalizedOptionTitle "${OPTION_PAGE_TITLE_EN}"
    StrCpy $LocalizedOptionSubtitle "${OPTION_PAGE_SUBTITLE_EN}"
    StrCpy $LocalizedKeepData "${KEEP_DATA_EN}"
    StrCpy $LocalizedSelectLang "${SELECT_LANG_EN}"
    StrCpy $LocalizedRunText "${RUN_AFTER_INSTALL_EN}"
    StrCpy $LocalizedCloseButton "${CLOSE_BUTTON_EN}"
    StrCpy $LocalizedPreservingTemplates "${PRESERVING_TEMPLATES_EN}"
    StrCpy $LocalizedRestoringTemplates "${RESTORING_TEMPLATES_EN}"
  ${ElseIf} $LANGUAGE == 1034 # LANG_SPANISH
    StrCpy $SelectedLanguage "es"
    StrCpy $InstallerLanguage "2"
    StrCpy $LocalizedOptionTitle "${OPTION_PAGE_TITLE_ES}"
    StrCpy $LocalizedOptionSubtitle "${OPTION_PAGE_SUBTITLE_ES}"
    StrCpy $LocalizedKeepData "${KEEP_DATA_ES}"
    StrCpy $LocalizedSelectLang "${SELECT_LANG_ES}"
    StrCpy $LocalizedRunText "${RUN_AFTER_INSTALL_ES}"
    StrCpy $LocalizedCloseButton "${CLOSE_BUTTON_ES}"
    StrCpy $LocalizedPreservingTemplates "${PRESERVING_TEMPLATES_ES}"
    StrCpy $LocalizedRestoringTemplates "${RESTORING_TEMPLATES_ES}"
  ${ElseIf} $LANGUAGE == 1036 # LANG_FRENCH
    StrCpy $SelectedLanguage "fr"
    StrCpy $InstallerLanguage "3"
    StrCpy $LocalizedOptionTitle "${OPTION_PAGE_TITLE_FR}"
    StrCpy $LocalizedOptionSubtitle "${OPTION_PAGE_SUBTITLE_FR}"
    StrCpy $LocalizedKeepData "${KEEP_DATA_FR}"
    StrCpy $LocalizedSelectLang "${SELECT_LANG_FR}"
    StrCpy $LocalizedRunText "${RUN_AFTER_INSTALL_FR}"
    StrCpy $LocalizedCloseButton "${CLOSE_BUTTON_FR}"
    StrCpy $LocalizedPreservingTemplates "${PRESERVING_TEMPLATES_FR}"
    StrCpy $LocalizedRestoringTemplates "${RESTORING_TEMPLATES_FR}"
  ${ElseIf} $LANGUAGE == 1031 # LANG_GERMAN
    StrCpy $SelectedLanguage "de"
    StrCpy $InstallerLanguage "4"
    StrCpy $LocalizedOptionTitle "${OPTION_PAGE_TITLE_DE}"
    StrCpy $LocalizedOptionSubtitle "${OPTION_PAGE_SUBTITLE_DE}"
    StrCpy $LocalizedKeepData "${KEEP_DATA_DE}"
    StrCpy $LocalizedSelectLang "${SELECT_LANG_DE}"
    StrCpy $LocalizedRunText "${RUN_AFTER_INSTALL_DE}"
    StrCpy $LocalizedCloseButton "${CLOSE_BUTTON_DE}"
    StrCpy $LocalizedPreservingTemplates "${PRESERVING_TEMPLATES_DE}"
    StrCpy $LocalizedRestoringTemplates "${RESTORING_TEMPLATES_DE}"
  ${Else}
    StrCpy $SelectedLanguage "it"
    StrCpy $InstallerLanguage "0"
    StrCpy $LocalizedOptionTitle "${OPTION_PAGE_TITLE_IT}"
    StrCpy $LocalizedOptionSubtitle "${OPTION_PAGE_SUBTITLE_IT}"
    StrCpy $LocalizedKeepData "${KEEP_DATA_IT}"
    StrCpy $LocalizedSelectLang "${SELECT_LANG_IT}"
    StrCpy $LocalizedRunText "${RUN_AFTER_INSTALL_IT}"
    StrCpy $LocalizedCloseButton "${CLOSE_BUTTON_IT}"
    StrCpy $LocalizedPreservingTemplates "${PRESERVING_TEMPLATES_IT}"
    StrCpy $LocalizedRestoringTemplates "${RESTORING_TEMPLATES_IT}"
  ${EndIf}
FunctionEnd

Function OptionsPageCreate
  ${If} $INSTALL_EXECUTED == "1"
    Abort
  ${EndIf}
  
  # Ottieni le stringhe localizzate
  Call GetLocalizedStrings
  
  !insertmacro MUI_HEADER_TEXT "$LocalizedOptionTitle" "$LocalizedOptionSubtitle"
  nsDialogs::Create 1018
  Pop $Dialog
  
  ${If} $Dialog == error
    Abort
  ${EndIf}
  
  ${NSD_CreateCheckbox} 10u 30u 100% 10u "$LocalizedKeepData"
  Pop $KeepDataCheckbox
  ${NSD_SetState} $KeepDataCheckbox 1
  
  ${NSD_CreateLabel} 10u 50u 100% 12u "$LocalizedSelectLang"
  Pop $0
  
  ${NSD_CreateComboBox} 10u 65u 200u 150u ""
  Pop $LanguageDropList
  SendMessage $LanguageDropList ${CB_ADDSTRING} 0 "STR:Italiano"
  SendMessage $LanguageDropList ${CB_ADDSTRING} 0 "STR:English"
  SendMessage $LanguageDropList ${CB_ADDSTRING} 0 "STR:Español"
  SendMessage $LanguageDropList ${CB_ADDSTRING} 0 "STR:Français"
  SendMessage $LanguageDropList ${CB_ADDSTRING} 0 "STR:Deutsch"
  SendMessage $LanguageDropList ${CB_SETCURSEL} $InstallerLanguage 0
  
  nsDialogs::Show
FunctionEnd

Function OptionsPageLeave
  ${NSD_GetState} $KeepDataCheckbox $KeepDataState
  ${If} $KeepDataState == ${BST_CHECKED}
    StrCpy $KEEP_CONFIG "1"
  ${Else}
    StrCpy $KEEP_CONFIG "0"
  ${EndIf}
  
  SendMessage $LanguageDropList ${CB_GETCURSEL} 0 0 $1
  
  ${If} $1 == 0
    StrCpy $SelectedLanguage "it"
  ${ElseIf} $1 == 1
    StrCpy $SelectedLanguage "en"
  ${ElseIf} $1 == 2
    StrCpy $SelectedLanguage "es"
  ${ElseIf} $1 == 3
    StrCpy $SelectedLanguage "fr"
  ${ElseIf} $1 == 4
    StrCpy $SelectedLanguage "de"
  ${Else}
    StrCpy $SelectedLanguage "it"
  ${EndIf}
FunctionEnd

# Definizione della macro preInit direttamente
!macro preInit
  # Impostazione predefinita per le variabili
  StrCpy $INSTALL_EXECUTED "0"
  StrCpy $INSTALLER_COMPLETED "0"
  StrCpy $INSTALLER_CLOSING "0"
  StrCpy $SelectedLanguage "it"
  StrCpy $InstallerLanguage "0"
  
  # Inizializza le stringhe localizzate
  Call GetLocalizedStrings
  
  ${If} ${FileExists} "$INSTDIR\Criterion.exe"
    StrCpy $APP_ALREADY_INSTALLED "1"
    ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString"
    ${If} $0 != ""
      DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
    ${EndIf}
    nsExec::Exec 'taskkill /F /IM "Criterion.exe" /T'
    ${If} ${FileExists} "$EXEDIR\Criterion-setup-${VERSION}.exe"
      DetailPrint "File di installazione esistente trovato: $EXEDIR\Criterion-setup-${VERSION}.exe"
      DetailPrint "Tentativo di rimozione del file esistente..."
      Delete /REBOOTOK "$EXEDIR\Criterion-setup-${VERSION}.exe"
      Sleep 1000
    ${EndIf}
  ${Else}
    StrCpy $APP_ALREADY_INSTALLED "0"
  ${EndIf}
!macroend

!macro customInstall
  ${If} $INSTALL_EXECUTED == "1"
    DetailPrint "Installazione già eseguita, salto."
    Return
  ${EndIf}
  
  StrCpy $INSTALL_EXECUTED "1"
  
  SetShellVarContext current
  
  CreateDirectory "$APPDATA\Criterion\config-store"
  
  ClearErrors
  FileOpen $0 "$APPDATA\Criterion\config-store\app-settings.json" w
  ${If} ${Errors}
    DetailPrint "Errore durante l'apertura del file app-settings.json"
    Sleep 500
    FileOpen $0 "$APPDATA\Criterion\config-store\app-settings.json" w
    ${If} ${Errors}
      DetailPrint "Impossibile creare il file di configurazione. L'applicazione userà le impostazioni predefinite."
      Goto JsonWriteEnd
    ${EndIf}
  ${EndIf}
  
  FileWrite $0 '{"language": "$SelectedLanguage"}'
  FileClose $0
  DetailPrint "Lingua selezionata salvata in $APPDATA\Criterion\config-store\app-settings.json: $SelectedLanguage"
  
  JsonWriteEnd:
  
  ${If} $KEEP_CONFIG != "1"
    RMDir /r "$APPDATA\criterion-store"
    Delete "$APPDATA\Criterion\*.*"
    RMDir /r "$APPDATA\Criterion\Session Storage"
    RMDir /r "$APPDATA\Criterion\Local Storage"
    Delete "$LOCALAPPDATA\Criterion\*"
    RMDir /r "$LOCALAPPDATA\Criterion"
    Goto EndPreInit
  ${EndIf}
  
  RMDir /r "$LOCALAPPDATA\Criterion\Cache"
  RMDir /r "$LOCALAPPDATA\Criterion\Code Cache"
  RMDir /r "$APPDATA\Criterion\Session Storage"
  RMDir /r "$APPDATA\Criterion\Local Storage"
  RMDir /r "$LOCALAPPDATA\Criterion\GPUCache"
  Delete "$LOCALAPPDATA\Criterion\*.log"
  RMDir /r "$TEMP\Criterion-updater"

  EndPreInit:
  
  ${If} $APP_ALREADY_INSTALLED == "1"
    # Backup user templates before removing buildResources
    ${If} ${FileExists} "$INSTDIR\resources\buildResources\templates\*.*"
      SetDetailsPrint both
      DetailPrint "$LocalizedPreservingTemplates"
      SetDetailsPrint listonly
      CreateDirectory "$TEMP\Criterion-templates-backup"
      CopyFiles /SILENT "$INSTDIR\resources\buildResources\templates\*.*" "$TEMP\Criterion-templates-backup\"
    ${EndIf}
    
    # Backup user styles before removing buildResources
    ${If} ${FileExists} "$INSTDIR\resources\buildResources\styles\*.*"
      SetDetailsPrint both
      DetailPrint "$LocalizedPreservingTemplates"
      SetDetailsPrint listonly
      CreateDirectory "$TEMP\Criterion-styles-backup"
      CopyFiles /SILENT "$INSTDIR\resources\buildResources\styles\*.*" "$TEMP\Criterion-styles-backup\"
    ${EndIf}
    
    # Also check for templates in the old location (backward compatibility)
    ${If} ${FileExists} "$INSTDIR\buildResources\templates\*.*"
      SetDetailsPrint both
      DetailPrint "$LocalizedPreservingTemplates"
      SetDetailsPrint listonly
      CreateDirectory "$TEMP\Criterion-templates-backup"
      CopyFiles /SILENT "$INSTDIR\buildResources\templates\*.*" "$TEMP\Criterion-templates-backup\"
    ${EndIf}
    
    # Also check for styles in the old location (backward compatibility)
    ${If} ${FileExists} "$INSTDIR\buildResources\styles\*.*"
      SetDetailsPrint both
      DetailPrint "$LocalizedPreservingTemplates"
      SetDetailsPrint listonly
      CreateDirectory "$TEMP\Criterion-styles-backup"
      CopyFiles /SILENT "$INSTDIR\buildResources\styles\*.*" "$TEMP\Criterion-styles-backup\"
    ${EndIf}
    
    # Remove buildResources but preserve templates and styles
    RMDir /r "$INSTDIR\resources\buildResources\appIcons"
    RMDir /r "$INSTDIR\resources\buildResources\fileIcons"
    RMDir /r "$INSTDIR\resources\buildResources\icons"
    # Note: templates and styles directories are preserved via backup/restore process
    Delete "$INSTDIR\resources\buildResources\appInfo.json"
    Delete "$INSTDIR\resources\buildResources\entitlements.mac.plist"
    Delete "$INSTDIR\resources\buildResources\icon.png"
    RMDir /r "$INSTDIR\buildResources\appIcons"
    RMDir /r "$INSTDIR\buildResources\fileIcons"
    RMDir /r "$INSTDIR\buildResources\icons"
    # Note: templates and styles directories are preserved via backup/restore process
    Delete "$INSTDIR\buildResources\appInfo.json"
    Delete "$INSTDIR\buildResources\entitlements.mac.plist"
    Delete "$INSTDIR\buildResources\icon.png"
    
    # Remove other directories and files
    RMDir /r "$INSTDIR\locales"
    Delete "$INSTDIR\*.dll"
    Delete "$INSTDIR\*.pak"
    Delete "$INSTDIR\*.bin"
    Delete "$INSTDIR\*.dat"
    Delete "$INSTDIR\Criterion.exe"
    
    SetDetailsPrint both
    DetailPrint "Aggiornamento dell'installazione esistente..."
    SetDetailsPrint listonly
    SetOverwrite on
    
    # Restore user templates after installation
    ${If} ${FileExists} "$TEMP\Criterion-templates-backup\*.*"
      SetDetailsPrint both
      DetailPrint "$LocalizedRestoringTemplates"
      SetDetailsPrint listonly
      CreateDirectory "$INSTDIR\resources\buildResources\templates"
      CopyFiles /SILENT "$TEMP\Criterion-templates-backup\*.*" "$INSTDIR\resources\buildResources\templates\"
      RMDir /r "$TEMP\Criterion-templates-backup"
    ${EndIf}
    
    # Restore user styles after installation
    ${If} ${FileExists} "$TEMP\Criterion-styles-backup\*.*"
      SetDetailsPrint both
      DetailPrint "$LocalizedRestoringTemplates"
      SetDetailsPrint listonly
      CreateDirectory "$INSTDIR\resources\buildResources\styles"
      CopyFiles /SILENT "$TEMP\Criterion-styles-backup\*.*" "$INSTDIR\resources\buildResources\styles\"
      RMDir /r "$TEMP\Criterion-styles-backup"
    ${EndIf}
  ${Else}
    # For fresh installations, check if there are preserved templates from previous uninstallation
    SetDetailsPrint both
    DetailPrint "Checking for preserved templates in: $APPDATA\Criterion\preserved-templates"
    SetDetailsPrint listonly
    
    ${If} ${FileExists} "$APPDATA\Criterion\preserved-templates\*.*"
      SetDetailsPrint both
      DetailPrint "$LocalizedRestoringTemplates"
      SetDetailsPrint listonly
      CreateDirectory "$INSTDIR\resources\buildResources\templates"
      CopyFiles /SILENT "$APPDATA\Criterion\preserved-templates\*.*" "$INSTDIR\resources\buildResources\templates\"
      SetDetailsPrint both
      DetailPrint "Templates restored to: $INSTDIR\resources\buildResources\templates"
      SetDetailsPrint listonly
      # Remove preserved templates after successful restoration
      RMDir /r "$APPDATA\Criterion\preserved-templates"
    ${Else}
      SetDetailsPrint both
      DetailPrint "No preserved templates found for restoration"
      SetDetailsPrint listonly
    ${EndIf}
    
    # Check if there are preserved styles from previous uninstallation
    SetDetailsPrint both
    DetailPrint "Checking for preserved styles in: $APPDATA\Criterion\preserved-styles"
    SetDetailsPrint listonly
    
    ${If} ${FileExists} "$APPDATA\Criterion\preserved-styles\*.*"
      SetDetailsPrint both
      DetailPrint "$LocalizedRestoringTemplates"
      SetDetailsPrint listonly
      CreateDirectory "$INSTDIR\resources\buildResources\styles"
      CopyFiles /SILENT "$APPDATA\Criterion\preserved-styles\*.*" "$INSTDIR\resources\buildResources\styles\"
      SetDetailsPrint both
      DetailPrint "Styles restored to: $INSTDIR\resources\buildResources\styles"
      SetDetailsPrint listonly
      # Remove preserved styles after successful restoration
      RMDir /r "$APPDATA\Criterion\preserved-styles"
    ${Else}
      SetDetailsPrint both
      DetailPrint "No preserved styles found for restoration"
      SetDetailsPrint listonly
    ${EndIf}
  ${EndIf}
  
  StrCpy $INSTALLER_COMPLETED "1"
!macroend

# Macro called by electron-builder at uninstaller initialization
!macro customUnInit
  # Initialize localized strings for uninstaller
  Call un.GetLocalizedStrings
  
  # Set shell context to current user to ensure correct path resolution
  SetShellVarContext current
  
  # Always preserve user templates during uninstallation - Do it in customUnInit to ensure it runs
  SetDetailsPrint both
  DetailPrint "UNINSTALLER: Starting template preservation process..."
  SetDetailsPrint listonly
  
  # For uninstallation, preserve user templates by moving them to a safe location
  SetDetailsPrint both
  DetailPrint "Checking for templates in: $INSTDIR\resources\buildResources\templates\"
  SetDetailsPrint listonly
  
  # Check if the templates directory exists (without wildcard)
  ${If} ${FileExists} "$INSTDIR\resources\buildResources\templates"
    # Check if there are any files in the directory
    FindFirst $0 $1 "$INSTDIR\resources\buildResources\templates\*.*"
    ${If} $0 != ""
      FindClose $0
      SetDetailsPrint both
      DetailPrint "$LocalizedPreservingTemplates"
      SetDetailsPrint listonly
      
      # Ensure the destination directory exists and has proper permissions
      CreateDirectory "$APPDATA\Criterion"
      CreateDirectory "$APPDATA\Criterion\preserved-templates"
      
      # Verify directory creation was successful
      ${If} ${FileExists} "$APPDATA\Criterion\preserved-templates"
        CopyFiles /SILENT "$INSTDIR\resources\buildResources\templates\*.*" "$APPDATA\Criterion\preserved-templates\"
        SetDetailsPrint both
        DetailPrint "Templates preserved to: $APPDATA\Criterion\preserved-templates"
        SetDetailsPrint listonly
        
        # Verify files were actually copied
        FindFirst $0 $1 "$APPDATA\Criterion\preserved-templates\*.*"
        ${If} $0 != ""
          FindClose $0
          SetDetailsPrint both
          DetailPrint "Template preservation verified - files found in preserved-templates"
          SetDetailsPrint listonly
        ${Else}
          SetDetailsPrint both
          DetailPrint "Warning: No files found after copying templates"
          SetDetailsPrint listonly
        ${EndIf}
      ${Else}
        SetDetailsPrint both
        DetailPrint "Error: Could not create preserved-templates directory"
        SetDetailsPrint listonly
      ${EndIf}
    ${Else}
      SetDetailsPrint both
      DetailPrint "No template files found in resources\buildResources\templates"
      SetDetailsPrint listonly
    ${EndIf}
  ${Else}
    SetDetailsPrint both
    DetailPrint "Templates directory not found: $INSTDIR\resources\buildResources\templates"
    SetDetailsPrint listonly
  ${EndIf}
  
  # For uninstallation, also preserve user styles by moving them to a safe location
  SetDetailsPrint both
  DetailPrint "Checking for styles in: $INSTDIR\resources\buildResources\styles\"
  SetDetailsPrint listonly
  
  # Check if the styles directory exists (without wildcard)
  ${If} ${FileExists} "$INSTDIR\resources\buildResources\styles"
    # Check if there are any files in the directory
    FindFirst $0 $1 "$INSTDIR\resources\buildResources\styles\*.*"
    ${If} $0 != ""
      FindClose $0
      SetDetailsPrint both
      DetailPrint "$LocalizedPreservingTemplates"
      SetDetailsPrint listonly
      
      # Ensure the destination directory exists and has proper permissions
      CreateDirectory "$APPDATA\Criterion"
      CreateDirectory "$APPDATA\Criterion\preserved-styles"
      
      # Verify directory creation was successful
      ${If} ${FileExists} "$APPDATA\Criterion\preserved-styles"
        CopyFiles /SILENT "$INSTDIR\resources\buildResources\styles\*.*" "$APPDATA\Criterion\preserved-styles\"
        SetDetailsPrint both
        DetailPrint "Styles preserved to: $APPDATA\Criterion\preserved-styles"
        SetDetailsPrint listonly
        
        # Verify files were actually copied
        FindFirst $0 $1 "$APPDATA\Criterion\preserved-styles\*.*"
        ${If} $0 != ""
          FindClose $0
          SetDetailsPrint both
          DetailPrint "Style preservation verified - files found in preserved-styles"
          SetDetailsPrint listonly
        ${Else}
          SetDetailsPrint both
          DetailPrint "Warning: No files found after copying styles"
          SetDetailsPrint listonly
        ${EndIf}
      ${Else}
        SetDetailsPrint both
        DetailPrint "Error: Could not create preserved-styles directory"
        SetDetailsPrint listonly
      ${EndIf}
    ${Else}
      SetDetailsPrint both
      DetailPrint "No style files found in resources\buildResources\styles"
      SetDetailsPrint listonly
    ${EndIf}
  ${Else}
    SetDetailsPrint both
    DetailPrint "Styles directory not found: $INSTDIR\resources\buildResources\styles"
    SetDetailsPrint listonly
  ${EndIf}
  
  # Also check the old location for backward compatibility
  SetDetailsPrint both
  DetailPrint "Checking for templates in: $INSTDIR\buildResources\templates\"
  SetDetailsPrint listonly
  
  ${If} ${FileExists} "$INSTDIR\buildResources\templates"
    # Check if there are any files in the directory
    FindFirst $0 $1 "$INSTDIR\buildResources\templates\*.*"
    ${If} $0 != ""
      FindClose $0
      SetDetailsPrint both
      DetailPrint "$LocalizedPreservingTemplates"
      SetDetailsPrint listonly
      
      # Ensure the destination directory exists
      CreateDirectory "$APPDATA\Criterion"
      CreateDirectory "$APPDATA\Criterion\preserved-templates"
      
      # Verify directory creation was successful
      ${If} ${FileExists} "$APPDATA\Criterion\preserved-templates"
        CopyFiles /SILENT "$INSTDIR\buildResources\templates\*.*" "$APPDATA\Criterion\preserved-templates\"
        SetDetailsPrint both
        DetailPrint "Legacy templates preserved to: $APPDATA\Criterion\preserved-templates"
        SetDetailsPrint listonly
      ${Else}
        SetDetailsPrint both
        DetailPrint "Error: Could not create preserved-templates directory for legacy templates"
        SetDetailsPrint listonly
      ${EndIf}
    ${Else}
      SetDetailsPrint both
      DetailPrint "No template files found in buildResources\templates"
      SetDetailsPrint listonly
    ${EndIf}
  ${Else}
    SetDetailsPrint both
    DetailPrint "Legacy templates directory not found: $INSTDIR\buildResources\templates"
    SetDetailsPrint listonly
  ${EndIf}
  
  # Also check the old location for styles (backward compatibility)
  SetDetailsPrint both
  DetailPrint "Checking for styles in: $INSTDIR\buildResources\styles\"
  SetDetailsPrint listonly
  
  ${If} ${FileExists} "$INSTDIR\buildResources\styles"
    # Check if there are any files in the directory
    FindFirst $0 $1 "$INSTDIR\buildResources\styles\*.*"
    ${If} $0 != ""
      FindClose $0
      SetDetailsPrint both
      DetailPrint "$LocalizedPreservingTemplates"
      SetDetailsPrint listonly
      
      # Ensure the destination directory exists
      CreateDirectory "$APPDATA\Criterion"
      CreateDirectory "$APPDATA\Criterion\preserved-styles"
      
      # Verify directory creation was successful
      ${If} ${FileExists} "$APPDATA\Criterion\preserved-styles"
        CopyFiles /SILENT "$INSTDIR\buildResources\styles\*.*" "$APPDATA\Criterion\preserved-styles\"
        SetDetailsPrint both
        DetailPrint "Legacy styles preserved to: $APPDATA\Criterion\preserved-styles"
        SetDetailsPrint listonly
      ${Else}
        SetDetailsPrint both
        DetailPrint "Error: Could not create preserved-styles directory for legacy styles"
        SetDetailsPrint listonly
      ${EndIf}
    ${Else}
      SetDetailsPrint both
      DetailPrint "No style files found in buildResources\styles"
      SetDetailsPrint listonly
    ${EndIf}
  ${Else}
    SetDetailsPrint both
    DetailPrint "Legacy styles directory not found: $INSTDIR\buildResources\styles"
    SetDetailsPrint listonly
  ${EndIf}
  
  SetDetailsPrint both
  DetailPrint "UNINSTALLER: Template preservation process completed"
  SetDetailsPrint listonly
!macroend

# Backup macro for compatibility - template preservation handled in customUnInit
!macro customUnInstall
  DetailPrint "customUnInstall macro called - template preservation handled in customUnInit"
!macroend

# Funzioni per l'uninstaller

Function un.InstfilesPageShow
  # Gestisce la pagina di elaborazione files dell'uninstaller
  Call un.GetLocalizedStrings
  
  # Nascondi il pulsante "Avanti" se presente - prova diversi ID
  GetDlgItem $0 $HWNDPARENT 1 # Next button
  ShowWindow $0 ${SW_HIDE}
  EnableWindow $0 0
  
  # Prova anche con ID diversi per essere sicuri
  GetDlgItem $0 $HWNDPARENT 1203 # Possible Next button ID
  ShowWindow $0 ${SW_HIDE}
  EnableWindow $0 0
FunctionEnd

Function un.CustomFinishPageCreate
  # Crea una pagina finale custom per l'uninstaller
  Call un.GetLocalizedStrings
  
  # Determina il messaggio di completamento in base alla lingua
  ${If} $LANGUAGE == 1040 # LANG_ITALIAN
    StrCpy $1 "Disinstallazione completata"
    StrCpy $2 "Criterion è stato disinstallato correttamente dal computer."
    StrCpy $3 "Chiudi"
  ${ElseIf} $LANGUAGE == 1033 # LANG_ENGLISH_US
    StrCpy $1 "Uninstallation Complete"
    StrCpy $2 "Criterion has been successfully uninstalled from your computer."
    StrCpy $3 "Close"
  ${ElseIf} $LANGUAGE == 2057 # LANG_ENGLISH_UK
    StrCpy $1 "Uninstallation Complete"
    StrCpy $2 "Criterion has been successfully uninstalled from your computer."
    StrCpy $3 "Close"
  ${ElseIf} $LANGUAGE == 1034 # LANG_SPANISH
    StrCpy $1 "Desinstalación Completada"
    StrCpy $2 "Criterion ha sido desinstalado correctamente de su computadora."
    StrCpy $3 "Cerrar"
  ${ElseIf} $LANGUAGE == 1036 # LANG_FRENCH
    StrCpy $1 "Désinstallation Terminée"
    StrCpy $2 "Criterion a été désinstallé avec succès de votre ordinateur."
    StrCpy $3 "Fermer"
  ${ElseIf} $LANGUAGE == 1031 # LANG_GERMAN
    StrCpy $1 "Deinstallation Abgeschlossen"
    StrCpy $2 "Criterion wurde erfolgreich von Ihrem Computer deinstalliert."
    StrCpy $3 "Schließen"
  ${Else}
    StrCpy $1 "Disinstallazione completata"
    StrCpy $2 "Criterion è stato disinstallato correttamente dal computer."
    StrCpy $3 "Chiudi"
  ${EndIf}
  
  !insertmacro MUI_HEADER_TEXT "$1" "$2"
  nsDialogs::Create 1018
  Pop $Dialog
  
  ${If} $Dialog == error
    Abort
  ${EndIf}
  
  # Crea un'etichetta con il messaggio di completamento
  ${NSD_CreateLabel} 10u 30u 100% 20u "$2"
  Pop $0
  
  # Nascondi i pulsanti standard Back e Next
  GetDlgItem $0 $HWNDPARENT 3 # Back button
  ShowWindow $0 ${SW_HIDE}
  EnableWindow $0 0
  
  GetDlgItem $0 $HWNDPARENT 1 # Next button  
  ShowWindow $0 ${SW_HIDE}
  EnableWindow $0 0
  
  # Aggiorna il pulsante Cancel per farlo diventare Close
  GetDlgItem $0 $HWNDPARENT 2 # Cancel button
  SendMessage $0 ${WM_SETTEXT} 0 "STR:$3"
  
  nsDialogs::Show
FunctionEnd

Function un.CustomFinishPageLeave
  # Quando l'utente clicca Close, chiudi l'uninstaller
  StrCpy $UNINSTALLER_CLOSING "1"
  SetErrorLevel 0
  Quit
FunctionEnd

Function un.GetLocalizedStrings
  # Inizializza variabili per l'uninstaller se non già fatto
  ${If} $UNINSTALLER_COMPLETED == ""
    StrCpy $UNINSTALL_EXECUTED "0"
    StrCpy $UNINSTALLER_COMPLETED "0"
    StrCpy $UNINSTALLER_CLOSING "0"
  ${EndIf}
  
  ${If} $LANGUAGE == 1040 # LANG_ITALIAN
    StrCpy $LocalizedCloseButton "${CLOSE_BUTTON_IT}"
    StrCpy $LocalizedPreservingTemplates "${PRESERVING_TEMPLATES_IT}"
    StrCpy $LocalizedRestoringTemplates "${RESTORING_TEMPLATES_IT}"
  ${ElseIf} $LANGUAGE == 1033 # LANG_ENGLISH_US
    StrCpy $LocalizedCloseButton "${CLOSE_BUTTON_EN}"
    StrCpy $LocalizedPreservingTemplates "${PRESERVING_TEMPLATES_EN}"
    StrCpy $LocalizedRestoringTemplates "${RESTORING_TEMPLATES_EN}"
  ${ElseIf} $LANGUAGE == 2057 # LANG_ENGLISH_UK
    StrCpy $LocalizedCloseButton "${CLOSE_BUTTON_EN}"
    StrCpy $LocalizedPreservingTemplates "${PRESERVING_TEMPLATES_EN}"
    StrCpy $LocalizedRestoringTemplates "${RESTORING_TEMPLATES_EN}"
  ${ElseIf} $LANGUAGE == 1034 # LANG_SPANISH
    StrCpy $LocalizedCloseButton "${CLOSE_BUTTON_ES}"
    StrCpy $LocalizedPreservingTemplates "${PRESERVING_TEMPLATES_ES}"
    StrCpy $LocalizedRestoringTemplates "${RESTORING_TEMPLATES_ES}"
  ${ElseIf} $LANGUAGE == 1036 # LANG_FRENCH
    StrCpy $LocalizedCloseButton "${CLOSE_BUTTON_FR}"
    StrCpy $LocalizedPreservingTemplates "${PRESERVING_TEMPLATES_FR}"
    StrCpy $LocalizedRestoringTemplates "${RESTORING_TEMPLATES_FR}"
  ${ElseIf} $LANGUAGE == 1031 # LANG_GERMAN
    StrCpy $LocalizedCloseButton "${CLOSE_BUTTON_DE}"
    StrCpy $LocalizedPreservingTemplates "${PRESERVING_TEMPLATES_DE}"
    StrCpy $LocalizedRestoringTemplates "${RESTORING_TEMPLATES_DE}"
  ${Else}
    StrCpy $LocalizedCloseButton "${CLOSE_BUTTON_IT}"
    StrCpy $LocalizedPreservingTemplates "${PRESERVING_TEMPLATES_IT}"
    StrCpy $LocalizedRestoringTemplates "${RESTORING_TEMPLATES_IT}"
  ${EndIf}
FunctionEnd



Function un.onGUIEnd
  # Final check - preserve templates one more time if not already done
  ${If} ${FileExists} "$INSTDIR\resources\buildResources\templates"
    FindFirst $0 $1 "$INSTDIR\resources\buildResources\templates\*.*"
    ${If} $0 != ""
      FindClose $0
      # Templates still exist, try to preserve them one last time
      ${If} ${FileExists} "$APPDATA\Criterion\preserved-templates"
        # Directory exists, check if it's empty
        FindFirst $2 $3 "$APPDATA\Criterion\preserved-templates\*.*"
        ${If} $2 == ""
          # Directory is empty, try to copy templates again
          CreateDirectory "$APPDATA\Criterion"
          CreateDirectory "$APPDATA\Criterion\preserved-templates"
          CopyFiles /SILENT "$INSTDIR\resources\buildResources\templates\*.*" "$APPDATA\Criterion\preserved-templates\"
        ${Else}
          FindClose $2
        ${EndIf}
      ${Else}
        # Directory doesn't exist, create it and copy
        CreateDirectory "$APPDATA\Criterion"
        CreateDirectory "$APPDATA\Criterion\preserved-templates"
        CopyFiles /SILENT "$INSTDIR\resources\buildResources\templates\*.*" "$APPDATA\Criterion\preserved-templates\"
      ${EndIf}
    ${EndIf}
  ${EndIf}

  # Final check - preserve styles one more time if not already done
  ${If} ${FileExists} "$INSTDIR\resources\buildResources\styles"
    FindFirst $0 $1 "$INSTDIR\resources\buildResources\styles\*.*"
    ${If} $0 != ""
      FindClose $0
      # Styles still exist, try to preserve them one last time
      ${If} ${FileExists} "$APPDATA\Criterion\preserved-styles"
        # Directory exists, check if it's empty
        FindFirst $2 $3 "$APPDATA\Criterion\preserved-styles\*.*"
        ${If} $2 == ""
          # Directory is empty, try to copy styles again
          CreateDirectory "$APPDATA\Criterion"
          CreateDirectory "$APPDATA\Criterion\preserved-styles"
          CopyFiles /SILENT "$INSTDIR\resources\buildResources\styles\*.*" "$APPDATA\Criterion\preserved-styles\"
        ${Else}
          FindClose $2
        ${EndIf}
      ${Else}
        # Directory doesn't exist, create it and copy
        CreateDirectory "$APPDATA\Criterion"
        CreateDirectory "$APPDATA\Criterion\preserved-styles"
        CopyFiles /SILENT "$INSTDIR\resources\buildResources\styles\*.*" "$APPDATA\Criterion\preserved-styles\"
      ${EndIf}
    ${EndIf}
  ${EndIf}

  # Assicura che l'uninstaller si chiuda correttamente e non riparta
  StrCpy $UNINSTALLER_CLOSING "1"
  
  # Termina forzatamente il processo per evitare loop
  SetErrorLevel 0
  
  # Termina ogni possibile processo di disinstallazione ancora attivo
  nsExec::Exec 'taskkill /F /IM "criterion-uninstaller.exe" /T 2>nul'
  nsExec::Exec 'taskkill /F /IM "uninstall*.exe" /T 2>nul'
FunctionEnd

Function un.onUninstSuccess
  # Marca la disinstallazione come completata
  StrCpy $UNINSTALLER_COMPLETED "1"
  ClearErrors
FunctionEnd

!ifndef MULTIUSER_INSTALLMODE_INSTDIR
  !define MULTIUSER_INSTALLMODE_INSTDIR "Criterion"
!endif
!ifndef MULTIUSER_INSTALLMODE_FUNCTION
  !define MULTIUSER_INSTALLMODE_FUNCTION MultiUserFinishFunction
!endif
!ifndef PRODUCT_DIR_REGKEY
  !define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\Criterion.exe"
!endif
!ifndef PRODUCT_UNINST_KEY
  !define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!endif
!ifndef PRODUCT_UNINST_ROOT_KEY
  !define PRODUCT_UNINST_ROOT_KEY "HKLM"
!endif
