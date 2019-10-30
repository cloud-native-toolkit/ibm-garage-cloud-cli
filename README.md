# IBM Garage Cloud CLI

Command-line tool to simplify activities related to IBM Cloud.

## Usage

1. Install the latest CLI by running:

    ```
    npm i -g @garage-catalyst/ibm-garage-cloud-cli
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

Optionally creates a namespace and prepares it for use by copying in
pull secrets and tls secrets from the default namespace and config maps and
secrets from the template namespace (defaults to `tools` if not provided)

### pipeline

Registers a project as a Jenkins pipeline by creating a Kubernetes secret to hold 
the Git authentication information, calling the Jenkins API, and creating a web-hook.
This command is intended to be run within the repository directory of a project for 
which a pipeline should be generated.
 
### tools

Launches the `ibm-garage-cli-tools` docker image in an interactive
terminal. This image provides commonly used infrastructure tools like,
`terraform`, `kubectl`, etc.
 
## Development

### Run the tests

```bash
npm test
```

### Run the cli locally

```bash
npm start
```
