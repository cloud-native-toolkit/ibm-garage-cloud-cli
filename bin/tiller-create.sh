#!/usr/bin/env bash

SCRIPT_ROOT=$(dirname $0 | xargs -I {} realpath {})

kubectl create -f ${SCRIPT_ROOT}/../chart/rbac-config.yaml
helm init --service-account tiller --history-max 200
