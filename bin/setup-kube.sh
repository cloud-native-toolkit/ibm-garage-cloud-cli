#!/usr/bin/env bash

if [[ -z "${CLUSTER_NAME}" ]]; then
  echo "CLUSTER_NAME is required"
  exit 1
fi

CLUSTER_ID=$(ibmcloud ks clusters | grep ${CLUSTER_NAME} | sed "s/${CLUSTER_NAME} *\([a-zA-Z0-9]*\) *.*/\1/g")

ibmcloud ks cluster-pull-secret-apply --cluster ${CLUSTER_ID}
