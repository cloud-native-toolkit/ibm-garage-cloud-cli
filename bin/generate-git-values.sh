#!/usr/bin/env bash

realpath() {
    [[ $1 = /* ]] && echo "$1" || echo "$PWD/${1#./}"
}

SCRIPT_DIR=$(dirname $0)
CHART_DIR=$(realpath ${HOME}/chart)

### Input

VALUES_FILE="$1"
if [[ -z "${NAMESPACE}" ]]; then
    echo "Values file is required as the first argument"
    exit 1
fi

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
    echo -n "Would you like to create the Git secret using your SSH key? [Y/n] "
    read USE_SSH
    if [[ "${USE_SSH}" == "n" ]] || [[ "${USE_SSH}" == "N" ]]; then
        URL_TYPE="HTTP"
        GIT_URL=$(echo "${GIT_URL}" | sed -e "s~git@\(.*\):\(.*\)~https://\1/\2~")
    else
         echo -n "Does your SSH key require a passphrase? [N/y] "
         read USE_PASSPHRASE
         if [[ "${USE_PASSPHRASE}" == "y" ]] || [[ "${USE_PASSPHRASE}" == "Y" ]]; then
             echo -n "Please provide your passphrase: "
             read -s SSH_PASSPHRASE
             echo ""
         fi
    fi
fi

echo -n "Please provide username for ${GIT_URL}: "
read GIT_USERNAME

if [[ "${URL_TYPE}" == "SSH" ]]; then
    echo "Getting private key from ~/.ssh/id_rsa"

    echo "git:" > ${VALUES_FILE}
    echo "  name: ${NAME}" >> ${VALUES_FILE}
    echo "  url: ${GIT_URL}" >> ${VALUES_FILE}
    echo "  username: ${GIT_USERNAME}" >> ${VALUES_FILE}
    echo "  privateKeyFile: ${HOME}/.ssh/id_rsa" >> ${VALUES_FILE}
    echo "  passphrase: ${SSH_PASSPHRASE}" >> ${VALUES_FILE}
else
    echo -n "Please provide your password/personal access token: "
    read -s GIT_PASSWORD

    echo "git:" > ${VALUES_FILE}
    echo "  name: ${NAME}" >> ${VALUES_FILE}
    echo "  url: ${GIT_URL}" >> ${VALUES_FILE}
    echo "  username: ${GIT_USERNAME}" >> ${VALUES_FILE}
    echo "  password: ${GIT_PASSWORD}" >> ${VALUES_FILE}
fi
