' Avvia GIANA - nessuna finestra nera visibile
Dim oShell
Set oShell = CreateObject("WScript.Shell")
oShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File " & _
  """\\wsl.localhost\Ubuntu\home\usnainukhtar\husnain2005\cnc-maintenance-system\avvia-cnc.ps1""", 0, False
Set oShell = Nothing
