import {
    PackageManifestSummary,
    PackageManifestSummaryApi,
    PackageManifestSummaryResult
} from "./package-manifest-summary.api";
import {KubePackageManifest, PackageManifest} from "../../api/kubectl";
import first from "../../util/first";
import {Container} from "typescript-ioc";

export class PackageManifestSummaryImpl implements PackageManifestSummaryApi {
    manifestService: KubePackageManifest

    constructor() {
        this.manifestService = Container.get(KubePackageManifest)
    }

    async summarizePackageManifests(): Promise<PackageManifestSummaryResult> {

        const manifests: PackageManifest[] = await this.manifestService.listAll()

        const packages: PackageManifestSummary[] = manifests
            .map((manifest: PackageManifest) => ({
                    packageName: manifest.status.packageName,
                    catalogSource: manifest.status.catalogSource,
                    catalogSourceNamespace: manifest.status.catalogSourceNamespace,
                    defaultChannel: manifest.status.defaultChannel,
                    publisher: manifest.status.catalogSourcePublisher,
                    channels: manifest.status.channels.map(channel => ({name: channel.name}))
                })
            )
            .sort((a: PackageManifestSummary, b: PackageManifestSummary): number => {

                const comparisons: number[] = [
                    a.catalogSourceNamespace.localeCompare(b.catalogSourceNamespace),
                    a.catalogSource.localeCompare(b.catalogSource),
                    a.packageName.localeCompare(b.packageName),
                ]

                return first(comparisons.filter(c => c !== 0)) || 0
            })

        return {packages}
    }
}
