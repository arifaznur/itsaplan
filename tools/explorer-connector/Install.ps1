$ErrorActionPreference = 'Stop'

$connectorRoot = Join-Path $env:LOCALAPPDATA 'ItsAPLAN\ExplorerConnector'
$sourceExe = Join-Path $PSScriptRoot 'ItsAPLAN.ExplorerConnector.exe'
$targetExe = Join-Path $connectorRoot 'ItsAPLAN.ExplorerConnector.exe'

if (-not (Test-Path -LiteralPath $sourceExe -PathType Leaf)) {
    throw 'ItsAPLAN.ExplorerConnector.exe is missing from the installer folder.'
}

New-Item -ItemType Directory -Force -Path $connectorRoot | Out-Null
Copy-Item -LiteralPath $sourceExe -Destination $targetExe -Force

$protocolKey = 'HKCU:\Software\Classes\itsaplan-open'
New-Item -Path $protocolKey -Force | Out-Null
Set-Item -Path $protocolKey -Value 'URL:ItsAPLAN Explorer Connector'
New-ItemProperty -Path $protocolKey -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
New-Item -Path "$protocolKey\DefaultIcon" -Force | Out-Null
Set-Item -Path "$protocolKey\DefaultIcon" -Value "`"$targetExe`",0"
New-Item -Path "$protocolKey\shell\open\command" -Force | Out-Null
Set-Item -Path "$protocolKey\shell\open\command" -Value "`"$targetExe`" `"%1`""

Add-Type -AssemblyName PresentationFramework
[System.Windows.MessageBox]::Show('The ItsAPLAN Explorer Connector is installed for this Windows account.', 'ItsAPLAN') | Out-Null
