# IBM Garage Cloud CLI

Command-line tool to simplify activities related to IBM Cloud.

## Usage

1. Install the latest CLI by running:

    ```
    npm i -g @ibmgaragecloud/cloud-native-toolkit-cli
    ```

    **Note:** If you had previously installed the cli from @garagecatalyst, you will need to remove it first:

    ```
    npm rm -g @garage-catalyst/ibm-garage-cloud-cli
    ```
   
2. Run the following to list the available commands:

    ```
    igc --help
    ```

## Available commands

### vlan

Lists the `vlans` for a particular `resource group` and `region`. The command
expects that an `ibmcloud login` has already been performed to set up the
environment.

### credentials

Prints the urls and credentials for the Catalyst tools deployed into the cluster.
This includes Jenkins, Argo CD, and SonarQube.

### ingress

Lists the ingress urls for the provided namespace. If no namespace
is provided, `dev` is used.

### namespace

Creates a namespace (if it doesn't exist) and prepares it for use by copying in
pull secrets from the default namespace and config maps and secrets from the 
template namespace (defaults to `tools` if not provided). The template namespace
can be provided with the `-t` flag. When run against OpenShift, this command will
actually create a `project` which will result in the creation of a namespace as well.

The `namespace` command will also add the pull secrets to a serviceAccount. The name
of the service account can be provided with the `-z` flag. If not provided then `default`
will be used.

Optionally, the namespace command can also set up the Jenkins environment and/or Tekton
environment through the use of the `--jenkins` flag and `--tekton` flag. When provided,
the `--jenkins` flag will install Jenkins into the namespace (only available on OpenShift)
and set up the Jenkins serviceAccount. The `--tekton` flag will copy the available Tasks
and Pipelines from the template namespace (defaults to `tools` if not provided).

**Example usages**

```bash
igc namespace my-namespace
```

- Creates the namespace `my-namespace` and updates the `default` service account in 
that namespace

```bash
igc namespace another-namespace -z my-sa --jenkins
```

- Creates the namespace `another-namespace` and the service account `my-sa` as
well as configuring the Jenkins environment

```bash
igc namespace last-namespace -t my-tools --tekton
```

- Creates the namespace `last-namespace` and updates the `default` service account
as well as configuring the Tekton Tasks and Pipelines using `my-tools` as the template
namespace 

### pipeline

Registers a project as a Jenkins or Tekton pipeline by creating a Secret to hold 
the Git authentication information, calling the Jenkins API or applying the appropriate
configuration yaml, creating a web-hook to trigger the pipeline when changes are pushed,
and triggering the initial build. 

**Note:** This command is intended to be run within the repository directory of a project for 
which a pipeline should be generated.

By default the pipeline deploys into the `dev` namespace. The namespace can be changed by passing
it in using the `-n` flag. If the target namespace does not exist, the command will fail with a
message to create the namespace using `igc namepace`

The pipeline command supports either `jenkins` or `tekton` pipelines using the flags:

- --jenkins or
- --tekton
 
Jenkins is the default if no value is provided. 

The command will prompt for the username and personal access token that should stored in
the secret to access the Git repository. Those values can be provided a the command-line using the
`-u` and `-p` flags, respectively.

**Example usage:**

```bash
igc pipeline --jenkins
```

- Creates a Jenkins pipeline in the `dev` namespace and will prompt for the git credentials.

```bash
igc pipeline -n my-dev -u gituser -p gitpat --tekton
```

- Creates a Tekton pipeline in the existing `my-dev` namespace and uses `gituser` and `gitpat`
for the git credentials
 
### tools

Launches the `ibm-garage-cli-tools` docker image in an interactive
terminal. This image provides commonly used infrastructure tools like,
`terraform`, `kubectl`, etc.

### enable

"Enables" an existing project with the DevOps infrastructure. The CLI reads the available 
pipelines from a pipeline repo and applies the selected pipeline. The default pipeline repo
is `https://ibm-garage-cloud.github.io/garage-pipelines/` but a different one can be
used by providing the `--repo` argument. 
 
## Development

### Run the tests

```bash
npm test
```

### Run the cli locally

```bash
npm start
```
