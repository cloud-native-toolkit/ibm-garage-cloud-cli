#!/usr/bin/env bash

realpath() {
    [[ $1 = /* ]] && echo "$1" || echo "$PWD/${1#./}"
}

SCRIPT_ROOT=$(realpath $(dirname $0))

API_TOKEN="$1"

if [[ -z "${CLUSTER_NAMESPACE}" ]]; then
    CLUSTER_NAMESPACE="tools"
fi
if [[ -z "${TMP_DIR}" ]]; then
    TMP_DIR=".tmp"
fi

mkdir -p ${TMP_DIR}

RELEASE_NAME="jenkins-access"

CHART_ROOT="${SCRIPT_ROOT}/../chart"
CHART_NAME="jenkins-access"
CHART_PATH="${CHART_ROOT}/${CHART_NAME}"

ibmcloud config --check-version=false
ibmcloud login -a https://cloud.ibm.com --apikey ${APIKEY} -g ${RESOURCE_GROUP} -r ${REGION}
ibmcloud cs cluster-config --cluster ${CLUSTER_NAME} --export > ${TMP_DIR}/.kubeconfig

source ${TMP_DIR}/.kubeconfig

echo "INITIALIZING helm with upgrade"
helm init --upgrade

echo -e "Deploying into: ${CLUSTER_NAMESPACE}."
helm upgrade --install --force ${RELEASE_NAME} ${CHART_PATH} \
    --namespace ${CLUSTER_NAMESPACE} \
    --set jenkins.username="${JENKINS_USERNAME}" \
    --set jenkins.password="${JENKINS_PASSWORD}" \
    --set jenkins.url="${JENKINS_HOST}" \
    --set jenkins.api_token="${API_TOKEN}"
