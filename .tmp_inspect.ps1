param(
  [string]$Path
)
# Read MINIDUMP_HEADER (first 32 bytes)
$bytes = [System.IO.File]::ReadAllBytes($Path)
$sig = [System.Text.Encoding]::ASCII.GetString($bytes, 0, 4)
$ver = [BitConverter]::ToUInt32($bytes, 4)
$nstreams = [BitConverter]::ToUInt32($bytes, 8)
$rva = [BitConverter]::ToUInt32($bytes, 12)
Write-Output ("Signature: " + $sig)
Write-Output ("Version: " + $ver.ToString("X"))
Write-Output ("Streams: " + $nstreams)
Write-Output ("Stream RVA: " + $rva.ToString("X"))

# Walk stream directory
for ($i = 0; $i -lt $nstreams; $i++) {
  $off = $rva + ($i * 12)
  $stype = [BitConverter]::ToUInt32($bytes, $off)
  $slen  = [BitConverter]::ToUInt32($bytes, $off + 4)
  $sloc  = [BitConverter]::ToUInt32($bytes, $off + 8)
  $name = switch ($stype) {
    3  { "ThreadList" }
    4  { "ModuleList" }
    5  { "MemoryList" }
    6  { "Exception" }
    7  { "SystemInfo" }
    9  { "MemoryInfoList" }
    15 { "MiscInfo" }
    16 { "MemoryInfoList" }
    17 { "ThreadInfoList" }
    19 { "TokenStream" }
    default { "Type$stype" }
  }
  Write-Output ("Stream " + $i + ": " + $name + " len=" + $slen + " loc=0x" + $sloc.ToString("X"))

  if ($stype -eq 6) {
    # MINIDUMP_EXCEPTION_STREAM at $sloc
    $threadId = [BitConverter]::ToUInt32($bytes, $sloc)
    $exCode   = [BitConverter]::ToUInt32($bytes, $sloc + 8)
    $exFlags  = [BitConverter]::ToUInt32($bytes, $sloc + 12)
    $exAddr   = [BitConverter]::ToUInt64($bytes, $sloc + 24)
    Write-Output ("  ThreadId: " + $threadId)
    Write-Output ("  ExceptionCode: 0x" + $exCode.ToString("X8"))
    Write-Output ("  ExceptionFlags: 0x" + $exFlags.ToString("X8"))
    Write-Output ("  ExceptionAddress: 0x" + $exAddr.ToString("X16"))
  }
}
