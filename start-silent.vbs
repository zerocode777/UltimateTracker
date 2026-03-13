Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = "c:\Users\Niko\Desktop\UltimateTracker"
shell.Run "node server.js", 0, False
