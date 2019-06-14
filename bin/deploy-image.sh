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

if [[ -z "${REGISTRY_NAMESPACE}" ]]; then
  echo "REGISTRY_NAMESPACE is required"
  exit 1
fi

if [[ -z "${CLUSTER_NAME}" ]]; then
  echo "CLUSTER_NAME is required"
  exit 1
fi

if [[ -z "${REGISTRY_URL}" ]]; then
  echo "REGISTRY_URL is required"
  exit 1
fi

if [[ -z "${TMP_DIR}" ]]; then
  TMP_DIR="/tmp"
fi

IMAGE_NAME="$1"
if [[ -z "${CHART_NAME}" ]]; then
  CHART_NAME="$1"
fi
IMAGE_VER="$2"
ENVIRONMENT_NAME="$3"

if [[ -z "${IMAGE_NAME}" ]] || [[ "${IMAGE_NAME}" = "undefined" ]]; then
  echo "Image name required as first arg"
  exit 1
fi

if [[ -z "${IMAGE_VER}" ]] || [[ "${IMAGE_VER}" = "undefined" ]]; then
  echo "Image version required as second arg"
  exit 1
fi

if [[ -z "${ENVIRONMENT_NAME}" ]] || [[ "${ENVIRONMENT_NAME}" = "undefined" ]]; then
  echo "Environment name required as third arg"
  exit 1
fi

if [[ -z "${CHART_ROOT}" ]]; then
  CHART_ROOT="."
fi

if [[ -z "${CLUSTER_NAMESPACE}" ]]; then
  CLUSTER_NAMESPACE="${CLUSTER_NAME}-${ENVIRONMENT_NAME}"
fi

CHART_PATH="${CHART_ROOT}/${CHART_NAME}"

ibmcloud -version

ibmcloud login -a https://cloud.ibm.com --apikey ${APIKEY} -g ${RESOURCE_GROUP} -r ${REGION}
ibmcloud cs cluster-config --cluster ${CLUSTER_NAME} --export > ${TMP_DIR}/.kubeconfig

source ${TMP_DIR}/.kubeconfig

echo "KUBECONFIG=${KUBECONFIG}"

echo "DEFINE RELEASE by prefixing image (app) name with namespace if not 'default' as Helm needs unique release names across namespaces"
if [[ "${CLUSTER_NAMESPACE}" != "default" ]]; then
  RELEASE_NAME="${CLUSTER_NAMESPACE}-${IMAGE_NAME}"
else
  RELEASE_NAME="${IMAGE_NAME}"
fi
echo "RELEASE_NAME: $RELEASE_NAME"

ibmcloud cr images --restrict ${REGISTRY_NAMESPACE}/${IMAGE_NAME} -q > ${TMP_DIR}/.images
if [[ -n "${IMAGE_BUILD_NUMBER}" ]]; then
  grep "${REGISTRY_NAMESPACE}/${IMAGE_NAME}:${IMAGE_VER}-${IMAGE_BUILD_NUMBER}" ${TMP_DIR}/.images -q
  if [[ $? -eq 0 ]]; then
    IMAGE_VER="${IMAGE_VER}-${IMAGE_BUILD_NUMBER}"
  fi
fi

grep "${REGISTRY_NAMESPACE}/${IMAGE_NAME}:${IMAGE_VER}" ${TMP_DIR}/.images -q
if [[ $? -ne 0 ]]; then
  echo "Image not found: ${REGISTRY_NAMESPACE}/${IMAGE_NAME}:${IMAGE_VER}"
  exit 1
fi

ibmcloud ks cluster-pull-secret-apply --cluster ${CLUSTER_NAME}

kubectl get namespace ${CLUSTER_NAMESPACE}
if [[ $? -ne 0 ]]; then
  kubectl create namespace ${CLUSTER_NAMESPACE}
  ${SCRIPT_ROOT}/setup-namespace-secrets.sh ${CLUSTER_NAMESPACE}
else
  ${SCRIPT_ROOT}/setup-namespace-secrets.sh ${CLUSTER_NAMESPACE}
fi

echo "INITIALIZING helm with upgrade"
helm init --upgrade

echo "CHECKING CHART (lint)"
helm lint ${CHART_PATH}

IMAGE_REPOSITORY="${REGISTRY_URL}/${REGISTRY_NAMESPACE}/${IMAGE_NAME}"
PIPELINE_IMAGE_URL="${REGISTRY_URL}/${REGISTRY_NAMESPACE}/${IMAGE_NAME}:${IMAGE_VER}"

# Using 'upgrade --install" for rolling updates. Note that subsequent updates will occur in the same namespace the release is currently deployed in, ignoring the explicit--namespace argument".
echo -e "Dry run into: ${CLUSTER_NAME}/${CLUSTER_NAMESPACE}."
helm upgrade --install --debug --dry-run ${RELEASE_NAME} ${CHART_PATH} --set image.repository=${IMAGE_REPOSITORY},image.tag=${IMAGE_VER},image.secretName="${CLUSTER_NAMESPACE}-us-icr-io",cluster_name="${CLUSTER_NAME}",region="${REGION}",namespace="${CLUSTER_NAMESPACE}",host="${IMAGE_NAME}" --namespace ${CLUSTER_NAMESPACE}

echo -e "Deploying into: ${CLUSTER_NAME}/${CLUSTER_NAMESPACE}."
helm upgrade --install ${RELEASE_NAME} ${CHART_PATH} --set image.repository=${IMAGE_REPOSITORY},image.tag=${IMAGE_VER},image.secretName="${CLUSTER_NAMESPACE}-us-icr-io",cluster_name="${CLUSTER_NAME}",region="${REGION}",namespace="${CLUSTER_NAMESPACE}",host="${IMAGE_NAME}" --namespace ${CLUSTER_NAMESPACE}


${SCRIPT_ROOT}/deploy-checkstatus.sh ${CLUSTER_NAMESPACE} ${IMAGE_NAME} ${IMAGE_REPOSITORY} ${IMAGE_VER}

echo ""
echo -e "History for release:${RELEASE_NAME}"
helm history ${RELEASE_NAME}

echo "=========================================================="
IP_ADDR=$(ibmcloud cs workers --cluster ${CLUSTER_NAME} | grep normal | head -n 1 | awk '{ print $2 }')
echo "IP Address: ${IP_ADDR}"
PORT=$(kubectl get services --namespace ${CLUSTER_NAMESPACE} | grep ${RELEASE_NAME} | sed 's/[^:]*:\([0-9]*\).*/\1/g')
echo -e "View the application health at: http://${IP_ADDR}:${PORT}/health"
