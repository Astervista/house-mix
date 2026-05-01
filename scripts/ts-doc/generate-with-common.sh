#!/bin/bash

TARGET_DIR_NAME=$1

if [ -z "$TARGET_DIR_NAME" ]; then
    echo "Error: Please provide a target directory name (e.g., ./generate-docs.sh backend)"
    exit 1
fi

SCRIPT_DIR=$(node -e "const path = require('path'); console.log(path.dirname(fs.realpathSync('$0')))")
PROJECT_ROOT=$(node -e "const path = require('path'); console.log(path.resolve('$SCRIPT_DIR', '../../'))")

COMMON_DIR="$PROJECT_ROOT/common"
COMMON_JSON="$PROJECT_ROOT/documentation/json/common.json"
EXTRACTOR_JS="$SCRIPT_DIR/export-common-symbols.js"
TARGET_DIR="$PROJECT_ROOT/$TARGET_DIR_NAME"
TARGET_CONFIG="$TARGET_DIR/typedoc.json"
TEMP_CONFIG="$TARGET_DIR/typedoc.temp.json"

echo "Locating files..."

if [ ! -f "$COMMON_JSON" ]; then
    echo "Missing $COMMON_JSON. Generating common documentation first..."
    cd "$COMMON_DIR"
    npx typedoc
fi

cd "$PROJECT_ROOT"

echo "Extracting symbols from $COMMON_JSON..."
COMMON_MAPPINGS_JSON=$(node "$EXTRACTOR_JS")

if [ -z "$COMMON_MAPPINGS_JSON" ]; then
    echo "Error: Failed to extract mappings."
    exit 1
fi

echo "Injecting common symbols into $TEMP_CONFIG"
export COMMON_MAPPINGS_JSON
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$TARGET_CONFIG', 'utf8'));
const mappings = JSON.parse(process.env.COMMON_MAPPINGS_JSON);

config.externalSymbolLinkMappings = config.externalSymbolLinkMappings || {};

for (const key in mappings) {
    if (config.externalSymbolLinkMappings[key] && typeof mappings[key] === 'object') {
        config.externalSymbolLinkMappings[key] = { ...config.externalSymbolLinkMappings[key], ...mappings[key] };
    } else {
        config.externalSymbolLinkMappings[key] = mappings[key];
    }
}

fs.writeFileSync('$TEMP_CONFIG', JSON.stringify(config, null, 2));
"

if [[ $? -ne 0 ]]; then
  echo "Could not generate the temp file"
  return 1;
fi

# 4. Execute TypeDoc
# We change directory to the backend so TypeDoc finds local node_modules and plugins
echo "Generating documentation..."
cd "$TARGET_DIR"
npx typedoc --options "typedoc.temp.json"

TD_RESULT=$?

# 5. Cleanup
rm "typedoc.temp.json"

if [[ $TD_RESULT -ne 0 ]]; then
  echo "Something went wrong."
else
  echo "Done! Backend documentation is ready."
fi

