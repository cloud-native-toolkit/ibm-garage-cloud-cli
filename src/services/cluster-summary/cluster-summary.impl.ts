import {ClusterSummary, ClusterSummaryApi, ClusterSummaryResult} from "./cluster-summary.api";
import {
    IngressConfig,
    KubeClusterVersion,
    KubeConfigMap,
    KubeIngressConfig,
    KubeNode,
    NodeInfo
} from "../../api/kubectl";
import first from "../../util/first";
import {Container} from "typescript-ioc";

export class ClusterSummaryImpl implements ClusterSummaryApi {

    nodeService: KubeNode
    clusterVersionService: KubeClusterVersion
    ingressConfigService: KubeIngressConfig
    configMapService: KubeConfigMap

    constructor() {
        this.nodeService = Container.get(KubeNode)
        this.clusterVersionService = Container.get(KubeClusterVersion)
        this.ingressConfigService = Container.get(KubeIngressConfig)
        this.configMapService = Container.get(KubeConfigMap)
    }

    async summarizeCluster(input: {gitopsNamespace?: string} = {}): Promise<ClusterSummaryResult> {
        const nodeInfo: NodeInfo = await this.nodeService.list()
            .then(result => first(result.map(node => node.status.nodeInfo)) || {} as NodeInfo)

        const kubeVersion: string = (nodeInfo.kubeletVersion || '').replace(/^v/, '')

        const openShiftVersion: string = await this.clusterVersionService.list()
            .then(result => first(result) || {status: {desired: {version: ''}}})
            .then(val => val.status.desired.version)
            .catch(err => '')

        const defaultIBMIngressInfo: {defaultIngressSubdomain?: string, defaultIngressSecret?: string} = await this.configMapService.get('ibm-cloud-cluster-ingress-info', 'kube-system')
            .then(result => ({defaultIngressSubdomain: result.data['ingress-subdomain'], defaultIngressSecret: result.data['ingress-secret']}))
            .catch(err => ({} as any))
        const defaultOpenShiftIngress: {defaultIngressSubdomain?: string, defaultIngressSecret?: string} = await this.ingressConfigService.list()
            .then(result => first(result) || {spec: {domain: ''}} as IngressConfig)
            .then(val => ({defaultIngressSubdomain: val.spec.domain}))
            .catch(err => ({} as any))

        const type = openShiftVersion ? 'ocp4' : 'kubernetes'

        const operatorNamespace = openShiftVersion ? 'openshift-operators' : 'operators'

        const gitopsNamespace = input.gitopsNamespace || (openShiftVersion ? 'openshift-gitops' : 'gitops')

        const cluster: ClusterSummary = Object.assign(
            {},
            defaultOpenShiftIngress,
            defaultIBMIngressInfo,
            nodeInfo,
            {openShiftVersion, kubeVersion, type, operatorNamespace, gitopsNamespace}
        )

        return {cluster}
    }
}