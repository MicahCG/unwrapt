#!/usr/bin/env bash
# Build web assets and sync into the Capacitor iOS project.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -d /Applications/Xcode.app ]]; then
  echo "Install full Xcode from the Mac App Store, then:"
  echo "  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
  exit 1
fi

if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods missing. Install with: brew install cocoapods"
  exit 1
fi

npx vite build --mode capacitor
npx cap sync ios
echo "Done. Open with: npm run cap:open"
echo "Then Archive in Xcode for TestFlight / App Store."
