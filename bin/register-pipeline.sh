#!/usr/bin/env bash

realpath() {
    [[ $1 = /* ]] && echo "$1" || echo "$PWD/${1#./}"
}

SCRIPT_ROOT=$(realpath $(dirname $0))

CLUSTER_NAMESPACE="$1"
RELEASE_NAME="$2"
VALUES_FILE="$3"

CHART_ROOT="${SCRIPT_ROOT}/../chart"
CHART_NAME="register-pipeline"
CHART_PATH="${CHART_ROOT}/${CHART_NAME}"

if [[ -z "${KUBECONFIG}" ]]; then
    echo "KUBECONFIG environment variable not found. It appears the kubernetes environment has not been initialized."
    echo "To initialize the kubernetes:"
    echo " 1) Navigate to https://cloud.ibm.com/kubernetes/clusters"
    echo " 2) Select the kubernetes cluster"
    echo " 3) Follow the instructions on the access tab"
    echo ""
    echo -n "Open the URL in the default browser? [Y/n]> "
    read open_browser

    if [[ "$open_browser" == "n" ]]; then
        exit 1
    fi
    open "https://cloud.ibm.com/kubernetes/clusters"

    exit
fi

echo "INITIALIZING helm with upgrade"
helm init --upgrade

echo -e "Generating secret: ${CLUSTER_NAMESPACE}."
helm upgrade --install --force ${RELEASE_NAME} ${CHART_PATH} --namespace ${CLUSTER_NAMESPACE} --values ${VALUES_FILE} 1> /dev/null 2> /dev/null

JENKINS_HOST=$(kubectl get secrets/jenkins-access -n tools --output jsonpath="{ .data.host }" | base64 --decode)
JENKINS_URL=$(kubectl get secrets/jenkins-access -n tools --output jsonpath="{ .data.url }" | base64 --decode)
USER_NAME=$(kubectl get secrets/jenkins-access -n tools --output jsonpath="{ .data.username }" | base64 --decode)
API_TOKEN=$(kubectl get secrets/jenkins-access -n tools --output jsonpath="{ .data.api_token }" | base64 --decode)

if [[ -z "${JENKINS_URL}" ]]; then
  JENKINS_URL="http://${JENKINS_HOST}"
fi

GIT_CREDENTIALS=${RELEASE_NAME}
GIT_REPO=$(kubectl get secrets/${GIT_CREDENTIALS} -n tools --output jsonpath="{ .data.url }" | base64 --decode)

if [[ -z "${JENKINS_URL}" ]] || [[ -z "${USER_NAME}" ]] || [[ -z "${API_TOKEN}" ]] || [[ -z "${GIT_REPO}" ]] || [[ -z "${GIT_CREDENTIALS}" ]]; then
    echo -e "Pipeline registration script is missing required fields"
    echo -e "Expected environment variables: {JENKINS_HOST} {USER_NAME} {API_TOKEN} {GIT_REPO} {GIT_BRANCH} {CONFIG_FILE}"
    echo -e "  where:"
    echo -e "    JENKINS_URL - the url of the Jenkins server"
    echo -e "    USER_NAME - the Jenkins user name"
    echo -e "    API_TOKEN - the Jenkins api token"
    echo -e "    GIT_REPO - the url of the git repo"
    echo -e "    GIT_CREDENTIALS - the name of the secret holding the git credentials"
    echo -e "    GIT_BRANCH - the branch that should be registered for the build. Defaults to 'master'"
    echo -e "    CONFIG_FILE - the file containing the pipeline config. Defaults to 'config-template.xml'"
    echo -e ""
    exit 1
fi

JOB_NAME=$(echo "${GIT_REPO}" | sed -e "s~.*/\(.*\)~\1~" | sed "s/.git//")
if [[ "${GIT_BRANCH}" != "master" ]]; then
    JOB_NAME="${JOB_NAME}_${GIT_BRANCH}"
fi

echo "Registering ${JOB_NAME} for ${GIT_REPO} with ${JENKINS_URL} as ${USER_NAME}"

CRUMB=$(curl -s "${JENKINS_URL}/crumbIssuer/api/xml?xpath=concat(//crumbRequestField,\":\",//crumb)" -u "${USER_NAME}:${API_TOKEN}")
cat ${SCRIPT_ROOT}/../etc/jenkins-config-template.xml | \
    sed "s~{{GIT_REPO}}~${GIT_REPO}~g" | \
    sed "s~{{GIT_CREDENTIALS}}~${GIT_CREDENTIALS}~g" | \
    sed "s~{{GIT_BRANCH}}~${GIT_BRANCH}~g" | \
    curl -s -X POST "${JENKINS_URL}/createItem?name=${JOB_NAME}" -u "${USER_NAME}:${API_TOKEN}" -d @- -H "${CRUMB}" -H "Content-Type:text/xml" \
    1> /dev/null 2> /dev/null

echo "JENKINS_URL=${JENKINS_URL}"
