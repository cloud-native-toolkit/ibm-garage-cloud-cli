#!/usr/bin/env bash

if [[ -z "$1" ]]; then
   echo "CLUSTER_NAMESPACE should be provided as first argument"
   exit 1
else
   echo "Using CLUSTER_NAMESPACE=$1"
   CLUSTER_NAMESPACE="$1"
fi

kubectl get secrets -n default | grep icr | sed "s/\([A-Za-z-]*\) *.*/\1/g" | while read default_secret; do
    echo "Copying secret: $default_secret"
    kubectl get secret ${default_secret} -o yaml | sed "s/default/${CLUSTER_NAMESPACE}/g" | kubectl -n ${CLUSTER_NAMESPACE} create -f -
done
