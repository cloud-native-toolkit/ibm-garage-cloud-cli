#!/usr/bin/env bash

realpath() {
    [[ $1 = /* ]] && echo "$1" || echo "$PWD/${1#./}"
}

SCRIPT_ROOT=$(realpath $(dirname $0))

CHART_ROOT="${SCRIPT_ROOT}/../chart"
CHART_NAME="register-pipeline"
CHART_PATH="${CHART_ROOT}/${CHART_NAME}"

if [[ -z "${KUBECONFIG}" ]]; then
    echo "KUBECONFIG environment variable not found. It appears the kubernetes environment has not been initialized."
    echo "To initialize the kubernetes:"
    echo " 1) Navigate to https://cloud.ibm.com/kubernetes/clusters"
    echo " 2) Select the kubernetes cluster"
    echo " 3) Follow the instructions on the access tab"
    echo ""
    echo -n "Open the URL in the default browser? [Y/n]> "
    read open_browser

    if [[ "$open_browser" == "n" ]]; then
        exit 1
    fi
    open "https://cloud.ibm.com/kubernetes/clusters"

    exit
fi

if [[ -z "${CLUSTER_NAMESPACE}" ]]; then
    CLUSTER_NAMESPACE="tools"
fi

echo "INITIALIZING helm with upgrade"
helm init --upgrade

echo -e "Deploying into: ${CLUSTER_NAMESPACE}."
helm upgrade --install --force ${RELEASE_NAME} ${CHART_PATH} --namespace ${CLUSTER_NAMESPACE} --values ${VALUES_FILE}
