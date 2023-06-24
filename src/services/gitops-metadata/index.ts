import {Container} from "typescript-ioc";

import {GitopsMetadataApi} from "./gitops-metadata.api";
import {GitopsMetadataImpl} from "./gitops-metadata.impl";

export * from './gitops-metadata.api'

Container.bind(GitopsMetadataApi).to(GitopsMetadataImpl)
