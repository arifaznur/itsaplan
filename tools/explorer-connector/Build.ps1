$ErrorActionPreference = 'Stop'

$project = Join-Path $PSScriptRoot 'ItsAPLAN.ExplorerConnector.csproj'
$publishRoot = Join-Path $PSScriptRoot 'publish'
$webDownloadRoot = Join-Path $PSScriptRoot '..\..\apps\web\public\downloads'
$archive = Join-Path $webDownloadRoot 'ItsAPLAN-Explorer-Connector-win-x64.zip'

dotnet publish $project -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o $publishRoot
New-Item -ItemType Directory -Force -Path $webDownloadRoot | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Install.ps1') -Destination $publishRoot -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Uninstall.ps1') -Destination $publishRoot -Force
Compress-Archive -Path "$publishRoot\*" -DestinationPath $archive -Force

Write-Host "Created $archive"
