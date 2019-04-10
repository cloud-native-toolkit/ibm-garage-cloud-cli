#!/usr/bin/env bash

if [[ -z "$1" ]]; then
   echo "REGISTRY_NAMESPACE should be provided as first argument"
   exit 1
else
   echo "Using REGISTRY_NAMESPACE=$REGISTRY_NAMESPACE"
   REGISTRY_NAMESPACE="$1"
fi

kubectl get secrets -n default | grep icr | sed "s/\([A-Za-z-]*\) *.*/\1/g" | while read default_secret; do
    echo "Copying secret: $default_secret"
    kubectl get secret ${default_secret} -o yaml | sed "s/default/${REGISTRY_NAMESPACE}/g" | kubectl -n ${REGISTRY_NAMESPACE} create -f -
done
