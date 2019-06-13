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

if [[ "${REGISTRY_URL}" =~ .*icr.io ]] && [[ -z "${REGISTRY_NAMESPACE}" ]]; then
  echo "REGISTRY_NAMESPACE is required"
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

IMAGE_NAME="$2"
if [[ -z "${CHART_NAME}" ]]; then
  CHART_NAME="${IMAGE_NAME}"
fi

IMAGE_VER="$3"

if [[ -z "${CLUSTER_NAMESPACE}" ]] || [[ "${CLUSTER_NAMESPACE}" = "undefined" ]]; then
  echo "Cluster namespace required as first arg"
  exit 1
fi

if [[ -z "${VALUES_FILE}" ]]; then
    if [[ -z "${IMAGE_NAME}" ]] || [[ "${IMAGE_NAME}" = "undefined" ]]; then
      echo "Image name required as second arg"
      exit 1
    fi

    if [[ -z "${IMAGE_VER}" ]] || [[ "${IMAGE_VER}" = "undefined" ]]; then
      echo "Image version required as third arg"
      exit 1
    fi
fi

if [[ -z "${CHART_ROOT}" ]]; then
  CHART_ROOT="."
fi

CHART_PATH="${CHART_ROOT}/${CHART_NAME}"

ibmcloud -version

ibmcloud login -a https://cloud.ibm.com --apikey ${APIKEY} -g ${RESOURCE_GROUP} -r ${REGION}
ibmcloud cs cluster-config --cluster ${CLUSTER_NAME} --export > ${TMP_DIR}/.kubeconfig

source ${TMP_DIR}/.kubeconfig

echo "KUBECONFIG=${KUBECONFIG}"

echo "Configuring cluster namespace"
if kubectl get namespace ${CLUSTER_NAMESPACE}; then
  echo -e "Namespace ${CLUSTER_NAMESPACE} found."
else
  kubectl create namespace ${CLUSTER_NAMESPACE}
  echo -e "Namespace ${CLUSTER_NAMESPACE} created."
fi

echo "DEFINE RELEASE by prefixing image (app) name with namespace if not 'default' as Helm needs unique release names across namespaces"
if [[ "${CLUSTER_NAMESPACE}" != "default" ]]; then
  RELEASE_NAME="${CLUSTER_NAMESPACE}-${IMAGE_NAME}"
else
  RELEASE_NAME="${IMAGE_NAME}"
fi
echo "RELEASE_NAME: $RELEASE_NAME"


if [[ "${REGISTRY_URL}" =~ .*icr.io ]]; then
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
fi

ibmcloud ks cluster-pull-secret-apply --cluster ${CLUSTER_NAME}

kubectl get namespace ${CLUSTER_NAMESPACE}
if [[ $? -ne 0 ]]; then
  kubectl create namespace ${CLUSTER_NAMESPACE}
  ${SCRIPT_ROOT}/setup-namespace-secrets.sh ${CLUSTER_NAMESPACE}
fi

echo "INITIALIZING helm with upgrade"
helm init --upgrade

echo "CHECKING CHART (lint)"
helm lint ${CHART_PATH}

IMAGE_REPOSITORY="${IMAGE_NAME}"
if [[ -n "${REGISTRY_NAMESPACE}" ]]; then
  IMAGE_REPOSITORY="${REGISTRY_NAMESPACE}/${IMAGE_REPOSITORY}"
fi

if [[ -n "${REGISTRY_URL}" ]]; then
  IMAGE_REPOSITORY="${REGISTRY_URL}/${IMAGE_REPOSITORY}"
fi

PIPELINE_IMAGE_URL="${IMAGE_REPOSITORY}:${IMAGE_VER}"

if [[ -n "${VALUES_FILE}" ]]; then
    echo -e "Dry run into: ${CLUSTER_NAME}/${CLUSTER_NAMESPACE}."
    helm upgrade --install --debug --dry-run ${RELEASE_NAME} ${CHART_PATH} --namespace ${CLUSTER_NAMESPACE} --values ${VALUES_FILE}

    echo -e "Deploying into: ${CLUSTER_NAME}/${CLUSTER_NAMESPACE}."
    helm upgrade --install ${RELEASE_NAME} ${CHART_PATH} --namespace ${CLUSTER_NAMESPACE} --values ${VALUES_FILE}
else
    echo -e "Dry run into: ${CLUSTER_NAME}/${CLUSTER_NAMESPACE}."
    helm upgrade --install --debug --dry-run ${RELEASE_NAME} ${CHART_PATH} --set image.repository=${IMAGE_REPOSITORY},image.tag=${IMAGE_VER},image.secretName="${CLUSTER_NAMESPACE}-us-icr-io" --namespace ${CLUSTER_NAMESPACE}

    echo -e "Deploying into: ${CLUSTER_NAME}/${CLUSTER_NAMESPACE}."
    helm upgrade --install ${RELEASE_NAME} ${CHART_PATH} --set image.repository=${IMAGE_REPOSITORY},image.tag=${IMAGE_VER},image.secretName="${CLUSTER_NAMESPACE}-us-icr-io" --namespace ${CLUSTER_NAMESPACE}
fi

# Using 'upgrade --install" for rolling updates. Note that subsequent updates will occur in the same namespace the release is currently deployed in, ignoring the explicit--namespace argument".

${SCRIPT_ROOT}/deploy-checkstatus.sh ${CLUSTER_NAMESPACE} ${IMAGE_NAME} ${IMAGE_REPOSITORY} ${IMAGE_VER}

echo ""
echo -e "History for release:${RELEASE_NAME}"
helm history ${RELEASE_NAME}

echo "=========================================================="
IP_ADDR=$(ibmcloud cs workers --cluster ${CLUSTER_NAME} | grep normal | head -n 1 | awk '{ print $2 }')
echo "IP Address: ${IP_ADDR}"
PORT=$(kubectl get services --namespace ${CLUSTER_NAMESPACE} | grep ${RELEASE_NAME} | sed 's/[^:]*:\([0-9]*\).*/\1/g')
echo -e "View the application health at: http://${IP_ADDR}:${PORT}/health"
