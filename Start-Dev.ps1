$ErrorActionPreference = 'Stop'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
    $nodePath = $nodeCommand.Source
} else {
    $nodePath = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
}
if (-not (Test-Path -LiteralPath $nodePath)) {
    throw 'Install Node.js 24 and pnpm, then follow frontend/README.md.'
}
$frontendPath = Join-Path $PSScriptRoot 'frontend'
if (-not (Test-Path -LiteralPath (Join-Path $frontendPath 'node_modules/vite/bin/vite.js'))) {
    throw 'Dependencies are missing. Run pnpm install in frontend first.'
}
Push-Location $frontendPath
try {
    & $nodePath scripts/dev.mjs
} finally {
    Pop-Location
}
