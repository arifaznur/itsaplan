# ItsAPLAN Explorer Connector

The connector registers the `itsaplan-open` protocol for the current Windows user. ItsAPLAN uses
that protocol to open a saved UNC or absolute drive path in Windows Explorer.

## Build the staff download

Run `Build.ps1` on Windows with the .NET 8 SDK. The script creates
`apps/web/public/downloads/ItsAPLAN-Explorer-Connector-win-x64.zip`. Sign the executable before
distributing it in production.

## Install

Extract the ZIP and run `Install.ps1`. The installation needs no administrator rights. Windows
may ask the user to confirm the first `itsaplan-open` link opened by their browser.

For central deployment, run the install script once in each staff member's Windows session. The
registration is stored under `HKEY_CURRENT_USER`.

## Security boundary

The connector accepts one `itsaplan-open://open?path=...` argument. It rejects relative paths,
device paths, control characters, and characters Windows does not allow in file names. It passes
the validated path to `explorer.exe` as a separate argument and does not invoke a command shell.
