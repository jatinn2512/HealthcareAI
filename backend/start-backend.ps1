Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$backendRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path $backendRoot

$venvPython = Join-Path $backendRoot ".venv\Scripts\python.exe"

if (Test-Path -Path $venvPython) {
    & $venvPython -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    exit $LASTEXITCODE
}

if (Get-Command python -ErrorAction SilentlyContinue) {
    & python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    exit $LASTEXITCODE
}

if (Get-Command py -ErrorAction SilentlyContinue) {
    & py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    exit $LASTEXITCODE
}

throw "Python was not found. Create backend/.venv or install Python and try again."
