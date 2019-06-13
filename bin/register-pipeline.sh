#!/usr/bin/env bash

realpath() {
    [[ $1 = /* ]] && echo "$1" || echo "$PWD/${1#./}"
}

SCRIPT_ROOT=$(realpath $(dirname $0))

if [[ -z "${APIKEY}" ]]; then
  echo "APIKEY is required"
  exit 1
fi

if [[ -z "${RESOURCE_GROUP}" ]]; then
  echo "RESOURCE_GROUP is required"
  exit 1
fi

if [[ -z "${REGION}" ]]; then
  echo "REGION is required"
  exit 1
fi

if [[ -z "${CLUSTER_NAME}" ]]; then
  echo "CLUSTER_NAME is required"
  exit 1
fi

if [[ -z "${TMP_DIR}" ]]; then
  TMP_DIR="/tmp"
fi

CLUSTER_NAMESPACE="$1"
RELEASE_NAME="$2"
VALUES_FILE="$3"

if [[ -z "${CLUSTER_NAMESPACE}" ]] || [[ "${CLUSTER_NAMESPACE}" = "undefined" ]]; then
  echo "Cluster namespace required as first arg"
  exit 1
fi

if [[ -z "${RELEASE_NAME}" ]]; then
  echo "Release name is required as third arg"
  exit 1
fi

if [[ -z "${VALUES_FILE}" ]]; then
  echo "Values file is required as third arg"
  exit 1
fi

CHART_ROOT="${SCRIPT_ROOT}/../chart"
CHART_NAME="register-pipeline"

CHART_PATH="${CHART_ROOT}/${CHART_NAME}"

ibmcloud -version

ibmcloud config --check-version=false

ibmcloud login -a https://cloud.ibm.com --apikey ${APIKEY} -g ${RESOURCE_GROUP} -r ${REGION}
ibmcloud ks cluster-config --cluster ${CLUSTER_NAME} --export > ${TMP_DIR}/.kubeconfig

source ${TMP_DIR}/.kubeconfig

echo "KUBECONFIG=${KUBECONFIG}"

echo "INITIALIZING helm with upgrade"
helm init --upgrade

echo "CHECKING CHART (lint)"
helm lint ${CHART_PATH}

echo -e "Dry run into: ${CLUSTER_NAME}/${CLUSTER_NAMESPACE}."
helm install --debug --dry-run --name ${RELEASE_NAME} ${CHART_PATH} --namespace ${CLUSTER_NAMESPACE} --values ${VALUES_FILE}

echo -e "Deploying into: ${CLUSTER_NAME}/${CLUSTER_NAMESPACE}."
helm install --name ${RELEASE_NAME} ${CHART_PATH} --namespace ${CLUSTER_NAMESPACE} --values ${VALUES_FILE}
