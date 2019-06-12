export class BaseOptions {
  apiKey: string;
  resourceGroup: string;
  region: string;
  registry = "us.icr.io";
  namespace = "default";
  imageName: string;
  imageVersion: string;
  buildNumber?: string;
}
