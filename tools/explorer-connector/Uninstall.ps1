$ErrorActionPreference = 'Stop'

$protocolKey = 'HKCU:\Software\Classes\itsaplan-open'
$connectorRoot = Join-Path $env:LOCALAPPDATA 'ItsAPLAN\ExplorerConnector'

if (Test-Path -LiteralPath $protocolKey) {
    Remove-Item -LiteralPath $protocolKey -Recurse -Force
}
if (Test-Path -LiteralPath $connectorRoot) {
    Remove-Item -LiteralPath $connectorRoot -Recurse -Force
}
