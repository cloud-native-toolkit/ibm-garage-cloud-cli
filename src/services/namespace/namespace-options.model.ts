
export class NamespaceOptionsModel {
  namespace: string;
  templateNamespace: string;
  serviceAccount: string;
  tekton?: boolean;
  argocd?: boolean;
  argocdNamespace?: string;
}
