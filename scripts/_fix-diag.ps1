$ErrorActionPreference = 'Continue'
$log = 'd:\Users\Administrator\Documents\GitHub\sops\scripts\_fix-log.txt'
$out = New-Object System.Collections.ArrayList
try {
  $f = 'd:\Users\Administrator\Documents\GitHub\sops\src\modules\app_center\views\master_analysis\ai_analysis\template.html'
  $c = [System.IO.File]::ReadAllText($f)
  [void]$out.Add("read len=$($c.Length)")
  $cnt = ([System.Text.RegularExpressions.Regex]::Matches($c, '(?<!color-)text-primary(?![\w-])')).Count
  [void]$out.Add("text-primary count=$cnt")
  $cnt2 = ([System.Text.RegularExpressions.Regex]::Matches($c, '(?<!color-)text-tertiary(?![\w-])')).Count
  [void]$out.Add("text-tertiary count=$cnt2")
} catch {
  [void]$out.Add("ERR: $($_.Exception.Message)")
  [void]$out.Add($_.ScriptStackTrace)
}
[System.IO.File]::WriteAllText($log, ($out -join "`n"))
