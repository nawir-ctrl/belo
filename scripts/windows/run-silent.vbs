Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)
' Jalankan start-all-auto.bat tanpa jendela CMD hitam (0 = hidden)
WshShell.Run """" & strDir & "\start-all-auto.bat""", 0, False
