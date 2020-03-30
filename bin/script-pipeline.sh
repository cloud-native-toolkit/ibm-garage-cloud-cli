#!/usr/bin/env bash

SCRIPT_DIR=$(cd $(dirname $0); pwd -P)
ROOT_DIR=$(cd "${SCRIPT_DIR}/.."; pwd -P)

"${ROOT_DIR}/dist/script.js" pipeline "$@"