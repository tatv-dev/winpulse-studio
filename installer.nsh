!macro customUnInstall
  DetailPrint "Stopping running instances of WinPulse Studio..."
  nsExec::Exec 'taskkill /F /IM "WinPulse Studio.exe" /T'
  nsExec::Exec 'taskkill /F /IM "electron.exe" /T'
  Sleep 1000
!macroend

!macro customInit
  DetailPrint "Checking running instances of WinPulse Studio..."
  nsExec::Exec 'taskkill /F /IM "WinPulse Studio.exe" /T'
!macroend
