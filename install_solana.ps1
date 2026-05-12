$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "--- Starting Solana Toolchain Installation ---"

Write-Host "1. Installing Rust..."
if (!(Test-Path "rustup-init.exe")) {
    curl.exe -L "https://win.rustup.rs/" -o "rustup-init.exe"
}
.\rustup-init.exe -y --quiet

Write-Host "Updating PATH for Rust..."
$env:PATH += ";$env:USERPROFILE\.cargo\bin"

Write-Host "2. Installing Solana CLI..."
$tmpDir = "C:\solana-install-tmp"
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

$solanaInstaller = "$tmpDir\solana-install-init.exe"
if (!(Test-Path $solanaInstaller)) {
    curl.exe -L "https://release.solana.com/v1.18.25/solana-install-init-x86_64-pc-windows-msvc.exe" -o $solanaInstaller
}

& $solanaInstaller v1.18.25

Write-Host "Updating PATH for Solana..."
# The installer typically puts Solana in ~/.local/share/solana/install/active_release/bin
$solanaBinPath = "$env:USERPROFILE\.local\share\solana\install\active_release\bin"
$env:PATH += ";$solanaBinPath"

Write-Host "Verifying installations..."
rustc --version
cargo --version
solana --version

Write-Host "3. Installing Anchor (AVM)..."
# This might take a few minutes
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

Write-Host "Installing latest Anchor via AVM..."
avm install latest
avm use latest

Write-Host "Verifying Anchor..."
anchor --version

Write-Host "--- Installation Complete ---"
