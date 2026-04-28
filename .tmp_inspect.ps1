param(
  [string]$Path
)
$bytes = [System.IO.File]::ReadAllBytes($Path)
$text  = [System.Text.Encoding]::ASCII.GetString($bytes)
$re    = [regex]'[\x20-\x7E]{8,}'
$keep  = [regex]'(?i)reason|exit|signal|exception|crash|process_type|--type|electron|render|gpu|browser|main\.|FATAL|ERROR|EXCEPTION|chrome|node\.dll|libcef|skia|v8'
foreach ($m in $re.Matches($text)) {
  $v = $m.Value
  if ($keep.IsMatch($v)) { Write-Output $v }
}
