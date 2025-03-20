Var KEEP_CONFIG

!macro customInstall
    MessageBox MB_YESNO "Vuoi mantenere le configurazioni e i dati dell'app?" IDYES KeepConfig
    
    StrCpy $KEEP_CONFIG "0"  ; L'utente ha scelto NO, quindi cancelliamo i dati
    Goto Continue
    
    KeepConfig:
    StrCpy $KEEP_CONFIG "1"  ; L'utente ha scelto Sì, quindi manteniamo i dati
    
    Continue:
    
    # Imposta il contesto utente corrente
    SetShellVarContext current
    
    # Se l'utente ha scelto di NON mantenere le configurazioni, puliamo tutto
    ${If} $KEEP_CONFIG != "1"
        RMDir /r "$APPDATA\criterion-store"
        Delete "$LOCALAPPDATA\Criterion\*"
        RMDir /r "$LOCALAPPDATA\Criterion"
        RMDir /r "$APPDATA\Criterion"

        Goto EndPreInit
    ${EndIf}
    
    # Cache dell'applicazione
    RMDir /r "$LOCALAPPDATA\Criterion\Cache"
    RMDir /r "$LOCALAPPDATA\Criterion\Code Cache"
    
    # File di sessione
    RMDir /r "$APPDATA\Criterion\Session Storage"
    RMDir /r "$APPDATA\Criterion\Local Storage"
    
    # GPUCache
    RMDir /r "$LOCALAPPDATA\Criterion\GPUCache"
    
    # Logs
    Delete "$LOCALAPPDATA\Criterion\*.log"
    
    # File temporanei
    RMDir /r "$TEMP\Criterion-updater"

    EndPreInit:
!macroend
