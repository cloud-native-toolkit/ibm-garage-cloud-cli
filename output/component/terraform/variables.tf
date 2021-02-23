variable "cluster_type" {
  type = string
  description = "The type of cluster into which the toolkit will be installed (openshift or ocp3 or ocp4)"
  default = ""
}
variable "cluster_login_user" {
  type = string
  description = "The username to log in to openshift"
  default = ""
}
variable "cluster_login_password" {
  type = string
  description = "The password to log in to openshift"
  default = ""
}
variable "cluster_login_token" {
  type = string
  description = "The token to log in to openshift"
  default = ""
}
variable "cluster_server_url" {
  type = string
  description = "The url to the server"
  default = ""
}
variable "cluster_ingress_subdomain" {
  type = string
  description = "The ROUTER_CANONICAL_HOSTNAME for the cluster"
  default = ""
}
variable "gitops_dir" {
  type = string
  description = "Directory where the gitops repo content should be written"
  default = ""
}
variable "storage_class" {
  type = string
  description = "The storage class that should be used for the dashboard and designer"
  default = ""
}
variable "cp-app-connect_dashboard" {
  type = bool
  description = "Flag to install the dashboard"
  default = 
}
variable "ibm-cp-catalog_entitlement_key" {
  type = string
  description = "The entitlement key used to access the CP4I images in the container registry. Visit https://myibm.ibm.com/products-services/containerlibrary to get the key"
  default = ""
}
variable "namespace_name" {
  type = string
  description = "The namespace that should be created"
  default = ""
}
