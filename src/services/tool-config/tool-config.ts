import {Inject} from 'typescript-ioc';
import {ToolConfigOptions} from './tool-config-options.model';
import {ConfigMap, KubeConfigMap, KubeSecret, Secret, KubeMetadata} from '../../api/kubectl';

// {{- if and .Values.username .Values.password }}
// apiVersion: v1
// kind: Secret
// metadata:
//   name: {{ include "tool-config.secret-name" . }}
// labels:
//   app.kubernetes.io/name: {{ include "tool-config.name" . }}
// app.kubernetes.io/version: {{ .Chart.Version }}
// app.kubernetes.io/part-of: {{ .Values.app }}
// app.kubernetes.io/component: {{ .Values.component }}
// chart: {{ include "tool-config.chart" . }}
// release: {{ .Release.Name }}
// group: {{ .Values.group }}
// annotations:
//   description: {{ printf "Secret to hold the username and password for %s so that other components can access it" (include "tool-config.name" .) }}
// type: Opaque
// stringData:
// {{ include "tool-config.NAME" . }}_PASSWORD: {{ .Values.username | quote }}
// {{ include "tool-config.NAME" . }}_USER: {{ .Values.password | quote }}
// {{- end }}

export class ToolsConfig {
  @Inject
  private kubeConfigMap: KubeConfigMap;
  @Inject
  private kubeSecret: KubeSecret;

  private partOf = 'catalyst';
  private component = 'tools';
  private group = 'catalyst-tools';

  async configureTool(options: ToolConfigOptions) {
    const namespace = options.namespace || 'tools';

    if (options.url) {
      await this.kubeConfigMap.createOrUpdate(
        `${options.name}-config`,
        {
          body: this.buildConfigMap(options.name, options.url)
        },
        namespace,
      ).then(configMap => {
        console.log(`Created configMap: ${namespace}/${configMap.metadata.name}`);

        return configMap;
      });
    }

    if (options.username && options.password) {
      await this.kubeSecret.createOrUpdate(
        `${options.name}-access`,
        {
          body: this.buildSecret(options.name, options.username, options.password),
        },
        namespace,
      ).then(secret => {
        console.log(`Created secret: ${namespace}/${secret.metadata.name}`);

        return secret;
      });
    }
  }

  buildConfigMap(name: string, url: string): ConfigMap {
    const configMapName = `${name}-config`;

    const configMap: ConfigMap = {
      metadata: this.buildMetadata(
        configMapName,
        `Config map to hold the url for ${name} in the environment so that other tools can access it`,
      ),
      data: {}
    };

    configMap.data[`${name.toUpperCase()}_URL`] = url;

    return configMap;
  }

  buildSecret(name: string, username: string, password: string): Secret {
    const secretName = `${name}-access`;

    const secret: Secret = {
      metadata: this.buildMetadata(
        secretName,
        `Secret to hold the username and password for ${name} so that other components can access it`,
      ),
      type: 'Opaque',
      stringData: {},
    };

    secret.stringData[`${name.toUpperCase()}_USER`] = username;
    secret.stringData[`${name.toUpperCase()}_PASSWORD`] = password;

    return secret;
  }

  buildMetadata(name: string, description: string): KubeMetadata {
    return {
      name,
      labels: {
        'app.kubernetes.io/name': name,
        'app.kubernetes.io/part-of': this.partOf,
        'app.kubernetes.io/component': this.component,
        'group': this.group,
      },
      annotations: {
        description,
      },
    };
  }
}
