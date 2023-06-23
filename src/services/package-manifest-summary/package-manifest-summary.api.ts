
export interface PackageManifestChannel {
    name: string
}

export interface PackageManifestSummary {
    catalogSource: string
    catalogSourceNamespace: string
    packageName: string
    defaultChannel: string
    publisher: string
    channels: PackageManifestChannel[]
}

export interface PackageManifestSummaryResult {
    packages: PackageManifestSummary[]
}

export abstract class PackageManifestSummaryApi {
    abstract summarizePackageManifests(): Promise<PackageManifestSummaryResult>
}
