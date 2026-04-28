param(
  [string]$Path
)
$bytes = [System.IO.File]::ReadAllBytes($Path)
$text  = [System.Text.Encoding]::ASCII.GetString($bytes)
$re    = [regex]'[\x20-\x7E]{6,}'
$keep  = [regex]'(?i)--type=|process_type|exit_code|exception_code|reason|signal|access violation|stack overflow|crash|FATAL|ERROR|out of memory|oom|OOM|EXCEPTION|render|browser|gpu-process|utility'
$seen  = New-Object System.Collections.Generic.HashSet[string]
foreach ($m in $re.Matches($text)) {
  $v = $m.Value
  if ($keep.IsMatch($v) -and $seen.Add($v)) { Write-Output $v }
}
