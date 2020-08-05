# IBM Garage Cloud Native Toolkit CLI

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
   
### Beta release

Release candidate commands are made available for early use and testing via the beta release
of the CLI. The beta release of the CLI can be installed by running:

```
npm i -g @ibmgaragecloud/cloud-native-toolkit-cli@beta
```

To return to the non-beta version of the cli, simply run:

```
npm i -g @ibmgaragecloud/cloud-native-toolkit-cli
```

## Available commands

### vlan

Lists the `vlans` for a particular `resource group` and `region`. The command
expects that an `ibmcloud login` has already been performed to set up the
environment.

### dashboard

Opens the Developer Dashboard in the default browser. The namespace where the dashboard has been
deployed can be provided with the `-n` flag. If not provided, `tools` will be used as the default.
If a default browser has not been configured then the url to the Dashboard will be printed out.

**Example usage**

```bash
igc dashboard
```

### credentials

Prints the urls and credentials for the Cloud Native Toolkit tools deployed into the cluster. The
command works by reading particular `ConfigMaps` and `Secrets` in a template namespace in the cluster 
that identify the tools. The template namespace is provided by using the `-n` flag. If not provided,
the template namespace defaults to `tools`. The tools reported include Jenkins, SonarQube, ArgoCD, etc.

The command expect that the cluster login has already been performed.

**Example usage**

```bash
igc credentials -n my-namespace
```

- lists the tools urls and credentials from the `my-namespace` namespace

### endpoints

Lists the ingress and/or route urls for the provided namespace. The namespace is provided
with the `-n` flag. If no namespace is provided, `dev` is used as the default. The results are 
provided in an interactive menu. If one of the endpoints is selected it will display the url and
launch it in the default browser. Selecting `Exit` will display the full list and exit.

The command expect that the cluster login has already been performed.

**Example usage**

```bash
igc endpoint -n tools
```

- lists the ingresses and routes in the `tools` namespace

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

The command expect that the cluster login has already been performed.

**Example usage**

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
 
A default pipeline type has not been set. If neither of the flags is provided then a prompt will
be shown to select one. 

The command will prompt for the username and personal access token that should stored in
the secret to access the Git repository. Those values can be provided a the command-line using the
`-u` and `-p` flags, respectively.

**Example usage**

```bash
igc pipeline --jenkins
```

- Creates a Jenkins pipeline in the `dev` namespace and will prompt for the git credentials.

```bash
igc pipeline -n my-dev -u gituser -p gitpat --tekton
```

- Creates a Tekton pipeline in the existing `my-dev` namespace and uses `gituser` and `gitpat`
for the git credentials

### tool-config

Configures a tool into the template namespace. The template namespace is provided with the `-n`
argument. If not provided, the template namespace will be `tools`. The tool-config takes the 
name of the tool as the first (and only) positional parameter. 

Configuration for the tool
can be provided with the `--url`, `--username`, and `--password` optional flags. If the `url`
is provided then a ConfigMap will be created. If the `username` and/or `password` are provided
then a Secret will be created,

**Example usage**

```bash
igc tool-config my-tool --url https://url.com/my-tool --username admin --password password
```

- configures a tool named `my-tool` with url `https://url.com/my-tool`, username of `admin`, and 
password of `password`

### enable

"Enables" an existing project with the DevOps artifacts. The CLI reads the
 list of
 available pipelines and applies the selected pipeline to your code repo. This
  command is
  intended to be run within a git repository directory of a project for
which a pipeline should be enabled.
```bash
igc enable
```

Once the project has been enabled you will need to run `igc pipeline` to
 register the git repo as a pipeline with your target development cluster.

The `enable` command adds a number of files to the local filesystem, including but not limited to:

- Helm chart
- Jenkinsfile

After `enable` is called, the generated files should be committed and pushed to the git repository.

The default pipeline repo is `https://ibm-garage-cloud.github.io/garage-pipelines/`, but a different one can be used by providing the `--repo` argument.  The source for the provided pipeline repo can be found at `https://github.com/ibm-garage-cloud/garage-pipelines` to use as a template.

## Development

### Run the tests

```bash
npm test
```

### Run the cli locally

```bash
npm start
```
