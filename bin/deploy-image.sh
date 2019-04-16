#!/usr/bin/env bash

SCRIPT_ROOT=$(dirname $0 | xargs -I {} realpath {})

if [[ -z "${APIKEY}" ]]; then
  echo "APIKEY is required"
  exit 1
fi

if [[ -z "${RESOURCE_GROUP}" ]]; then
  echo "RESOURCE_GROUP is required"
  exit 1
fi

if [[ -z "${CLUSTER_NAME}" ]]; then
  echo "CLUSTER_NAME is required"
  exit 1
fi

if [[ -z "${TMP_DIR}" ]]; then
  TMP_DIR="/tmp"
fi

IMAGE_NAME="$1"
CHART_NAME="$1"
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

CLUSTER_NAMESPACE="${CLUSTER_NAME}-${ENVIRONMENT_NAME}"
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
  RELEASE_NAME=${IMAGE_NAME}
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

echo "INITIALIZING helm with upgrade"
helm init --upgrade

echo "CHECKING CHART (lint)"
helm lint ${CHART_PATH}

IMAGE_REPOSITORY="${REGISTRY_URL}/${REGISTRY_NAMESPACE}/${IMAGE_NAME}"
PIPELINE_IMAGE_URL="${REGISTRY_URL}/${REGISTRY_NAMESPACE}/${IMAGE_NAME}:${IMAGE_VER}"

# Using 'upgrade --install" for rolling updates. Note that subsequent updates will occur in the same namespace the release is currently deployed in, ignoring the explicit--namespace argument".
echo -e "Dry run into: ${CLUSTER_NAME}/${CLUSTER_NAMESPACE}."
helm upgrade --install --debug --dry-run ${RELEASE_NAME} ${CHART_PATH} --set image.repository=${IMAGE_REPOSITORY},image.tag=${IMAGE_VER} --namespace ${CLUSTER_NAMESPACE}

echo -e "Deploying into: ${CLUSTER_NAME}/${CLUSTER_NAMESPACE}."
helm upgrade --install ${RELEASE_NAME} ${CHART_PATH} --set image.repository=${IMAGE_REPOSITORY},image.tag=${IMAGE_VER} --namespace ${CLUSTER_NAMESPACE}

echo -e "CHECKING deployment status of release ${RELEASE_NAME} with image tag: ${IMAGE_VER}"
echo ""
for ITERATION in {1..30}
do
  DATA=$( kubectl get pods --namespace ${CLUSTER_NAMESPACE} -a -l release=${RELEASE_NAME} -o json )
  NOT_READY=$( echo $DATA | jq '.items[].status.containerStatuses[] | select(.image=="'"${IMAGE_REPOSITORY}:${IMAGE_VER}"'") | select(.ready==false) ' )
  if [[ -z "$NOT_READY" ]]; then
    echo -e "All pods are ready:"
    echo $DATA | jq '.items[].status.containerStatuses[] | select(.image=="'"${IMAGE_REPOSITORY}:${IMAGE_VER}"'") | select(.ready==true) '
    break # deployment succeeded
  fi
  REASON=$(echo $DATA | jq '.items[].status.containerStatuses[] | select(.image=="'"${IMAGE_REPOSITORY}:${IMAGE_VER}"'") | .state.waiting.reason')
  echo -e "${ITERATION} : Deployment still pending..."
  echo -e "NOT_READY:${NOT_READY}"
  echo -e "REASON: ${REASON}"
  if [[ ${REASON} == *ErrImagePull* ]] || [[ ${REASON} == *ImagePullBackOff* ]]; then
    echo "Detected ErrImagePull or ImagePullBackOff failure. "
    echo "Please check proper authenticating to from cluster to image registry (e.g. image pull secret)"
    break; # no need to wait longer, error is fatal
  elif [[ ${REASON} == *CrashLoopBackOff* ]]; then
    echo "Detected CrashLoopBackOff failure. "
    echo "Application is unable to start, check the application startup logs"
    break; # no need to wait longer, error is fatal
  fi
  sleep 5
done

if [[ ! -z "$NOT_READY" ]]; then
  echo ""
  echo "=========================================================="
  echo "DEPLOYMENT FAILED"
  echo "Deployed Services:"
  kubectl describe services ${RELEASE_NAME}-${CHART_NAME} --namespace ${CLUSTER_NAMESPACE}
  echo ""
  echo "Deployed Pods:"
  kubectl describe pods --selector app=${CHART_NAME} --namespace ${CLUSTER_NAMESPACE}
  echo ""
  echo "Application Logs"
  kubectl logs --selector app=${CHART_NAME} --namespace ${CLUSTER_NAMESPACE}
  echo "=========================================================="
  PREVIOUS_RELEASE=$( helm history ${RELEASE_NAME} | grep SUPERSEDED | sort -r -n | awk '{print $1}' | head -n 1 )
  echo -e "Could rollback to previous release: ${PREVIOUS_RELEASE} using command:"
  echo -e "helm rollback ${RELEASE_NAME} ${PREVIOUS_RELEASE}"
  # helm rollback ${RELEASE_NAME} ${PREVIOUS_RELEASE}
  # echo -e "History for release:${RELEASE_NAME}"
  # helm history ${RELEASE_NAME}
  # echo "Deployed Services:"
  # kubectl describe services ${RELEASE_NAME}-${CHART_NAME} --namespace ${CLUSTER_NAMESPACE}
  # echo ""
  # echo "Deployed Pods:"
  # kubectl describe pods --selector app=${CHART_NAME} --namespace ${CLUSTER_NAMESPACE}
  exit 1
fi

echo ""
echo "=========================================================="
echo "DEPLOYMENT SUCCEEDED"
echo ""
echo -e "Status for release:${RELEASE_NAME}"
helm status ${RELEASE_NAME}

echo ""
echo -e "History for release:${RELEASE_NAME}"
helm history ${RELEASE_NAME}

PIPELINE_IMAGE_URL="${REGISTRY_URL}/${REGISTRY_NAMESPACE}/${IMAGE_NAME}:${IMAGE_BUILD_NUMBER}"

echo "=========================================================="
IP_ADDR=$(ibmcloud cs workers --cluster ${CLUSTER_NAME} ${PIPELINE_KUBERNETES_CLUSTER_NAME} | grep normal | head -n 1 | awk '{ print $2 }')
echo "IP Address: ${IP_ADDR}"
PORT=$(kubectl get services --namespace ${CLUSTER_NAMESPACE} | grep ${RELEASE_NAME} | sed 's/[^:]*:\([0-9]*\).*/\1/g')
echo -e "View the application health at: http://${IP_ADDR}:${PORT}/health"
