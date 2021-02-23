module "cluster" {
  source = "github.com/ibm-garage-cloud/terraform-k8s-ocp-cluster?ref=v2.4.4"

  cluster_type = var.cluster_type
  login_user = var.cluster_login_user
  login_password = var.cluster_login_password
  login_token = var.cluster_login_token
  server_url = var.cluster_server_url
  ingress_subdomain = var.cluster_ingress_subdomain
  gitops_dir = var.gitops_dir

}
module "cp-app-connect" {
  source = "github.com/ibm-garage-cloud/terraform-ibm-cp-app-connect?ref=v1.0.1"

  cluster_type = module.cluster.type_code
  cluster_config_file = module.cluster.config_file_path
  catalog_name = module.ibm-cp-catalog.name
  platform-navigator-name = module.ibm-cp-platform-navigator.name
  namespace = module.namespace.name
  gitops_dir = var.gitops_dir
  storage_class = var.storage_class
  dashboard = var.cp-app-connect_dashboard

}
module "ibm-cp-catalog" {
  source = "github.com/ibm-garage-cloud/terraform-ibm-cp-catalog?ref=v1.3.1"

  cluster_config_file = module.cluster.config_file_path
  release_namespace = module.namespace.name
  cluster_type_code = module.cluster.type_code
  entitlement_key = var.ibm-cp-catalog_entitlement_key

}
module "namespace" {
  source = "github.com/ibm-garage-cloud/terraform-k8s-namespace?ref=v2.7.2"

  cluster_type = module.cluster.type_code
  cluster_config_file_path = module.cluster.config_file_path
  tls_secret_name = module.cluster.tls_secret_name
  name = var.namespace_name

}
module "ibm-cp-platform-navigator" {
  source = "github.com/ibm-garage-cloud/terraform-ibm-cp-platform-navigator?ref=v1.2.2"

  cluster_type = module.cluster.type_code
  cluster_config_file = module.cluster.config_file_path
  namespace = module.namespace.name
  catalog_name = module.ibm-cp-catalog.name
  gitops_dir = var.gitops_dir

}
