$ErrorActionPreference = 'Stop'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else {
    Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
}
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js 24 is required.' }
Push-Location (Join-Path $PSScriptRoot 'frontend')
try {
    & $nodePath scripts/tunnel.mjs
} finally {
    Pop-Location
}
