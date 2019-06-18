#!/usr/bin/env bash

realpath() {
    [[ $1 = /* ]] && echo "$1" || echo "$PWD/${1#./}"
}

SCRIPT_DIR=$(dirname $0)
CHART_DIR=$(realpath ${HOME}/chart)

### Input

VALUES_FILE="$1"
if [[ -z "${VALUES_FILE}" ]]; then
    echo "Values file is required as the first argument"
    exit 1
fi

mkdir -p $(dirname ${VALUES_FILE})

### Logic

GIT_URL=$(git remote get-url origin)
if [[ -z "${GIT_URL}" ]]; then
    echo "Unable to find git url. This script must be run in the git repo directory."
    exit 1
fi

NAME=$(echo "${GIT_URL}" | sed -e "s~.*/\(.*\)~\1~" | sed "s/.git//")
URL_TYPE=$(echo "${GIT_URL}" | sed -e "s/^git@.*/SSH/")

if [[ "${URL_TYPE}" == "SSH" ]]; then
    echo "We found you are using an ssh git url: ${GIT_URL}"
    echo -n "We will convert to an HTTP url"

    URL_TYPE="HTTP"
    GIT_URL=$(echo "${GIT_URL}" | sed -e "s~git@\(.*\):\(.*\)~https://\1/\2~")
fi

echo -n "Please provide username for ${GIT_URL}: "
read GIT_USERNAME

echo -n "Please provide your password/personal access token: "
read -s GIT_PASSWORD

echo "git:" > ${VALUES_FILE}
echo "  name: ${NAME}" >> ${VALUES_FILE}
echo "  url: ${GIT_URL}" >> ${VALUES_FILE}
echo "  username: ${GIT_USERNAME}" >> ${VALUES_FILE}
echo "  password: ${GIT_PASSWORD}" >> ${VALUES_FILE}
