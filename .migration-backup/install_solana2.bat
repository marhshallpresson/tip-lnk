@echo off
echo "--- Starting Solana Toolchain Installation ---"

echo "1. Installing Rust..."
if not exist "rustup-init.exe" (
    curl.exe -L "https://win.rustup.rs/" -o "rustup-init.exe"
)
rustup-init.exe -y --quiet

echo "Updating PATH for Rust..."
set PATH=%PATH%;%USERPROFILE%\.cargo\bin

echo "2. Installing Solana CLI..."
mkdir C:\solana-install-tmp 2>nul
if not exist "C:\solana-install-tmp\solana-install-init.exe" (
    curl.exe -L "https://release.solana.com/v1.18.25/solana-install-init-x86_64-pc-windows-msvc.exe" -o "C:\solana-install-tmp\solana-install-init.exe"
)
"C:\solana-install-tmp\solana-install-init.exe" v1.18.25

echo "Updating PATH for Solana..."
set PATH=%PATH%;%USERPROFILE%\.local\share\solana\install\active_release\bin

echo "Verifying installations..."
rustc --version
cargo --version
solana --version

echo "3. Installing Anchor (AVM)..."
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

echo "Verifying Anchor..."
anchor --version

echo "--- Installation Complete ---"
