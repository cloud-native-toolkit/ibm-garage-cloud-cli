#!/bin/bash

# IBM Cloud Garage, Catalyst Team

SCRIPT_DIR=$(dirname $0)
SRC_DIR="$( cd "${SCRIPT_DIR}/../src" ; pwd -P )"

if [[ -z "$APIKEY" ]]; then
   APIKEY=""
fi
if [[ -z "$CLASSIC_USERNAME" ]]; then
   CLASSIC_USERNAME=""
fi
if [[ -n "$CLASSIC_API_KEY" ]]; then
   CLASSIC_API_KEY=""
fi

DOCKER_IMAGE="garagecatalyst/ibm-garage-cli-tools:latest"

echo "Running Cleanup..."
docker kill ibm-garage-cli-tools
docker rm ibm-garage-cli-tools

echo "Initializing..."
docker run -itd --name ibm-garage-cli-tools \
   -v $(pwd):/home/devops/host \
   -v $(pwd)/.kube:/home/devops/.kube \
   -v $(pwd)/.helm:/home/devops/.helm \
   -e TF_VAR_ibmcloud_api_key="${APIKEY}" \
   -e BM_API_KEY="${APIKEY}" \
   -e SL_USERNAME="${CLASSIC_USERNAME}" \
   -e SL_API_KEY="${CLASSIC_API_KEY}" \
   -w /home/devops/host \
   ${DOCKER_IMAGE}
if [[ -d ./src/workspace ]]; then
    docker exec -it --workdir /home/devops/host/src/workspace ibm-garage-cli-tools terraform init
fi

echo "Attaching..."
docker attach ibm-garage-cli-tools
