import {NodeInfo} from "../../api/kubectl";

export interface ClusterSummary extends NodeInfo {
    defaultIngressSubdomain?: string
    defaultIngressSecret?: string
    kubeVersion: string
    openShiftVersion: string
    type: string
    operatorNamespace: string
}

export interface ClusterSummaryResult {
    cluster: ClusterSummary
}

export abstract class ClusterSummaryApi {
    abstract summarizeCluster(): Promise<ClusterSummaryResult>
}
