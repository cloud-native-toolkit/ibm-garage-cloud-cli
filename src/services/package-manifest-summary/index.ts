import {PackageManifestSummaryApi} from "./package-manifest-summary.api";
import {Container} from "typescript-ioc";
import {PackageManifestSummaryImpl} from "./package-manifest-summary.impl";

export * from './package-manifest-summary.api'

Container.bind(PackageManifestSummaryApi).to(PackageManifestSummaryImpl)
