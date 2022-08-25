#!/usr/bin/env sh

#!/usr/bin/env bash

DEST_DIR="${1:-$DEST_DIR}"
RELEASE="${2:-$RELEASE}"

if [[ -z "${DEST_DIR}" ]]; then
  DEST_DIR="/usr/local/bin"
fi

if [[ -z "${RELEASE}" ]]; then
  RELEASE=$(curl -sL "https://api.github.com/repos/cloud-native-toolkit/ibm-garage-cloud-cli/releases/latest" | grep tag_name | sed -E 's/.*"tag_name": ?"([^"]+)".*/\1/g')
fi

TYPE="linux"
OS=$(uname)
if [[ "$OS" == "Linux" ]]; then
  TYPE=$(cat /etc/os-release | grep -E "^ID=" | sed "s/ID=//g")
  if [[ "${TYPE}" != "alpine" ]]; then
    TYPE="linux"
  fi
elif [[ "$OS" == "Darwin" ]]; then
  TYPE="macos"
else
  echo "OS not supported"
  exit 1
fi

ARCH=""
case $(uname -m) in
    i386)    ARCH="x64" ;;
    i686)    ARCH="x64" ;;
    x86_64)  ARCH="x64" ;;
    aarch64) ARCH="arm64" ;;
    arm64)   ARCH="arm64" ;;
    *)       echo "Unable to determine system architecture" >&2; exit 1 ;;
esac

echo "Installing version ${RELEASE} of Cloud-Native Toolkit cli for ${TYPE}-${ARCH} into ${DEST_DIR}"
curl --progress-bar -Lo "${DEST_DIR}/igc" "https://github.com/cloud-native-toolkit/ibm-garage-cloud-cli/releases/download/${RELEASE}/igc-${TYPE}=${ARCH}" && chmod +x "${DEST_DIR}/igc"
echo "Installing igc cli as plugins to kubectl/oc clis"
"${DEST_DIR}/igc" plugins --path "${DEST_DIR}"
