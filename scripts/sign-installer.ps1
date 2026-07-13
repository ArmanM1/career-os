param([Parameter(Mandatory = $true)][string]$CertificateThumbprint)
$ErrorActionPreference = "Stop"
$script = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\apps\worker\installer\install.ps1"))
$certificate = Get-ChildItem -LiteralPath "Cert:\CurrentUser\My\$CertificateThumbprint" -ErrorAction Stop
$signature = Set-AuthenticodeSignature -FilePath $script -Certificate $certificate -TimestampServer "http://timestamp.digicert.com" -HashAlgorithm SHA256
if ($signature.Status -ne "Valid") { throw "Installer signature failed: $($signature.StatusMessage)" }
Write-Output "Signed $script"
