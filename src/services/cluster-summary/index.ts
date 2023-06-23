import {Container} from "typescript-ioc";

import {ClusterSummaryApi} from "./cluster-summary.api";
import {ClusterSummaryImpl} from "./cluster-summary.impl";

export * from './cluster-summary.api'

Container.bind(ClusterSummaryApi).to(ClusterSummaryImpl)
