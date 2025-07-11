# Vosk Library Setup Instructions

To use speech recognition with Vosk, you need to download the Vosk library for your platform.

## macOS Setup

1. Visit the Vosk API releases page: https://github.com/alphacep/vosk-api/releases

2. Download the appropriate library for your system:
   - For Intel Macs: Look for `vosk-osx-x86_64-*.zip`
   - For Apple Silicon (M1/M2): Look for `vosk-osx-aarch64-*.zip`

3. Extract the downloaded zip file

4. Copy the `libvosk.dylib` file to the `src-tauri/libs/` directory

5. Make sure the library is accessible:
   ```bash
   cd src-tauri
   ls libs/libvosk.dylib  # Should show the file
   ```

## Alternative: Build from Python Package

If pre-built binaries are not available:

```bash
# Create a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install vosk
pip install vosk

# Find the library
find venv -name "libvosk.dylib" -o -name "_vosk.*.so"

# Copy the found library to libs/
cp <path-to-library> libs/libvosk.dylib
```

## Verification

Once the library is in place, you can build the project:

```bash
pnpm tauri dev
```

The build script will automatically find and link the Vosk library.