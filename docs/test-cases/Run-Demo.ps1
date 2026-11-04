$ErrorActionPreference = 'Stop'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$runtimePath = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { $runtimePath }
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js 24 is required. Install the project dependencies first.' }
& $nodePath (Join-Path $PSScriptRoot 'run-demo.mjs')
if ($LASTEXITCODE -ne 0) { throw 'A demonstration check failed. Review the error above.' }
