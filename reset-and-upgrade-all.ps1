# reset-and-upgrade-all.ps1
# Clean out existing installs and caches
Remove-Item -Recurse -Force node_modules, yarn.lock, .yarn\cache -ErrorAction SilentlyContinue
yarn cache clean
yarn install

# Load package.json as a PowerShell object
$pkgJson = Get-Content package.json -Raw | ConvertFrom-Json

# Collect both dependencies and devDependencies
$allDeps = @()
if ($pkgJson.dependencies) { $allDeps += $pkgJson.dependencies.PSObject.Properties.Name }
if ($pkgJson.devDependencies) { $allDeps += $pkgJson.devDependencies.PSObject.Properties.Name }

# Debug: show what we found
Write-Host "Found dependencies:" $allDeps

# Loop through each package and upgrade to latest
foreach ($dep in $allDeps) {
    $pattern = "$dep@latest"
    Write-Host "Upgrading $pattern..."
    yarn up $pattern
}
