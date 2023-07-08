import {NodeInfo} from "../../api/kubectl";

export interface ClusterSummary extends NodeInfo {
    defaultIngressSubdomain?: string
    defaultIngressSecret?: string
    kubeVersion: string
    openShiftVersion: string
    type: string
    operatorNamespace: string
    gitopsNamespace: string
}

export interface ClusterSummaryResult {
    cluster: ClusterSummary
}

export abstract class ClusterSummaryApi {
    abstract summarizeCluster(input?: {gitopsNamespace?: string}): Promise<ClusterSummaryResult>
}
