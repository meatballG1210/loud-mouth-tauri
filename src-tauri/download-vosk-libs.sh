#!/bin/bash

# Create libs directory if it doesn't exist
mkdir -p libs

# Detect OS
OS="$(uname -s)"

case "${OS}" in
    Darwin*)
        echo "Downloading Vosk libraries for macOS..."
        # Download the latest Vosk macOS library
        curl -L https://github.com/alphacep/vosk-api/releases/download/v0.3.45/vosk-osx-0.3.45.zip -o vosk-osx.zip
        unzip vosk-osx.zip
        cp vosk-osx-0.3.45/libvosk.dylib libs/
        rm -rf vosk-osx-0.3.45 vosk-osx.zip
        echo "Vosk library installed to libs/libvosk.dylib"
        ;;
    Linux*)
        echo "Downloading Vosk libraries for Linux..."
        curl -L https://github.com/alphacep/vosk-api/releases/download/v0.3.45/vosk-linux-x86_64-0.3.45.zip -o vosk-linux.zip
        unzip vosk-linux.zip
        cp vosk-linux-x86_64-0.3.45/libvosk.so libs/
        rm -rf vosk-linux-x86_64-0.3.45 vosk-linux.zip
        echo "Vosk library installed to libs/libvosk.so"
        ;;
    MINGW*|CYGWIN*|MSYS*)
        echo "Downloading Vosk libraries for Windows..."
        curl -L https://github.com/alphacep/vosk-api/releases/download/v0.3.45/vosk-win64-0.3.45.zip -o vosk-win.zip
        unzip vosk-win.zip
        cp vosk-win64-0.3.45/vosk.dll libs/
        rm -rf vosk-win64-0.3.45 vosk-win.zip
        echo "Vosk library installed to libs/vosk.dll"
        ;;
    *)
        echo "Unknown OS: ${OS}"
        exit 1
        ;;
esac

echo "Done! You can now build the project with 'pnpm tauri dev'"