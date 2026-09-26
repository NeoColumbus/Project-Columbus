param([string]$State = 'candidate', [switch]$Summary, [string]$Revise)
$ErrorActionPreference = 'Stop'
$credentialPath = Join-Path $env:LOCALAPPDATA 'FullCity\private-review.clixml'
if (!(Test-Path -LiteralPath $credentialPath)) { throw 'Private reviewer credential is not configured on this Windows account.' }
$credential = Import-Clixml -LiteralPath $credentialPath
$previous = $env:FIELD_REVIEW_TOKEN
try {
    $env:FIELD_REVIEW_TOKEN = $credential.GetNetworkCredential().Password
    $arguments = @((Join-Path $PSScriptRoot 'field-review.mjs'), "--state=$State")
    if ($Summary) { $arguments += '--summary' }
    if ($Revise) { $arguments += "--revise=$Revise" }
    & node @arguments
    if ($LASTEXITCODE -ne 0) { throw 'Private review command failed.' }
} finally { $env:FIELD_REVIEW_TOKEN = $previous }
