import {IBMCloudConfig, RegisterTektonPipeline} from './register-tekton-pipeline';
import {Container} from 'typescript-ioc';
import {CreateGitSecret, GitParams} from '../git-secret';
import {mockField, providerFromValue} from '../../testHelper';
import {Namespace} from '../namespace';
import {KubeTektonPipelineResource} from '../../api/kubectl/tekton-pipeline-resource';
import {ConfigMap, KubeConfigMap} from '../../api/kubectl';
import {KubeTektonPipelineRun} from '../../api/kubectl/tekton-pipeline-run';
import Mock = jest.Mock;
import {ClusterType} from '../../util/cluster-type';
import {KubeNamespace} from '../../api/kubectl/namespace';
import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {KubeTektonPipeline} from '../../api/kubectl/tekton-pipeline';

describe('register-tekton-pipeline', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  let classUnderTest: RegisterTektonPipeline;
  let createGitSecret: CreateGitSecret;
  let kubePipeline: KubeTektonPipeline;
  let kubePipelineResource: KubeTektonPipelineResource;
  let kubePipelineRun: KubeTektonPipelineRun;
  let kubeConfigMap: KubeConfigMap;
  let namespaceBuilder: Namespace;
  let getClusterType: Mock;
  let kubeNamespace_exists: Mock;
  beforeEach(() => {
    createGitSecret = {
      getParametersAndCreateSecret: jest.fn(),
    } as any;
    Container.bind(CreateGitSecret)
      .provider(providerFromValue(createGitSecret));

    namespaceBuilder = {
      create: jest.fn()
    };
    Container.bind(Namespace)
      .provider(providerFromValue(namespaceBuilder));

    kubePipelineResource = {
      createOrUpdate: jest.fn()
    } as any;
    Container.bind(KubeTektonPipelineResource)
      .provider(providerFromValue(kubePipelineResource));

    kubePipeline = {
      copy: jest.fn(),
    } as any;
    Container.bind(KubeTektonPipeline)
      .provider(providerFromValue(kubePipeline));

    kubePipelineRun = {
      create: jest.fn()
    } as any;
    Container.bind(KubeTektonPipelineRun)
      .provider(providerFromValue(kubePipelineRun));

    kubeConfigMap = {
      get: jest.fn(),
    } as any;
    Container.bind(KubeConfigMap)
      .provider(providerFromValue(kubeConfigMap));

    getClusterType = jest.fn();
    Container.bind(ClusterType)
      .provider(providerFromValue({getClusterType}));

    kubeNamespace_exists = jest.fn();
    Container.bind(KubeNamespace)
      .provider(providerFromValue({exists: kubeNamespace_exists}));

    classUnderTest = Container.get(RegisterTektonPipeline);
  });

  describe('given registerPipeline()', () => {
    let createServiceAccount: Mock;
    let createGitPipelineResource: Mock;
    let createImagePipelineResource: Mock;
    let getPipelineName: Mock;
    let createPipelineRun: Mock;
    beforeEach(() => {
      createServiceAccount = mockField(classUnderTest, 'createServiceAccount');
      createGitPipelineResource = mockField(classUnderTest, 'createGitPipelineResource');
      createImagePipelineResource = mockField(classUnderTest, 'createImagePipelineResource');
      getPipelineName = mockField(classUnderTest, 'getPipelineName');
      createPipelineRun = mockField(classUnderTest, 'createPipelineRun');
    });

    const pipelineNamespace = 'test';
    const templateNamespace = 'tools;';
    const notifyStatus = (text: string) => undefined;

    describe('when namespace exists', () => {

      const repoName = 'repoName';
      const gitName = 'gitName';
      const imageName = 'imageName';
      const pipelineName = 'pipelineName';
      const clusterType = 'clusterType';
      const serviceAccount = 'serviceAccount';
      const secretName = 'secretName';
      const newPipelineName = 'newPipelineName';
      const gitParams = {repo: repoName};

      beforeEach(() => {
        getClusterType.mockResolvedValue({clusterType});
        kubeNamespace_exists.mockResolvedValue(true);
        (createGitSecret.getParametersAndCreateSecret as Mock).mockResolvedValue({gitParams, secretName, configMapName: 'configMapName'});
        createServiceAccount.mockResolvedValue(serviceAccount);
        createGitPipelineResource.mockResolvedValue(gitName);
        createImagePipelineResource.mockResolvedValue(imageName);
        getPipelineName.mockResolvedValue(pipelineName);
        (kubePipeline.copy as Mock).mockResolvedValue({metadata: {name: newPipelineName}})
      });

      test('should get cluster type', async () => {
        let options = {pipelineNamespace, templateNamespace};
        await classUnderTest.registerPipeline(options, notifyStatus);

        expect(getClusterType).toHaveBeenCalledWith(templateNamespace);
      });

      test('should get git parameters', async () => {
        let options: RegisterPipelineOptions = {pipelineNamespace, templateNamespace, replaceGitSecret: false};
        await classUnderTest.registerPipeline(options, notifyStatus);

        expect(createGitSecret.getParametersAndCreateSecret).toHaveBeenCalledWith(
          Object.assign(
            {},
            options,
            {
              namespaces: [options.pipelineNamespace],
              replace: options.replaceGitSecret,
            }),
          notifyStatus,
        );
      });

      test('should setup serviceAccount', async () => {
        await classUnderTest.registerPipeline({pipelineNamespace, templateNamespace}, notifyStatus);

        expect(createServiceAccount).toHaveBeenCalledWith(pipelineNamespace, clusterType, [secretName], notifyStatus);
      });

      test('should create git pipeline resource', async () => {
        let options = {pipelineNamespace, templateNamespace};
        await classUnderTest.registerPipeline(options, notifyStatus);

        expect(createGitPipelineResource).toHaveBeenCalledWith(options, gitParams);
      });

      test('should create image pipeline resource', async () => {
        const options = {pipelineNamespace, templateNamespace};
        await classUnderTest.registerPipeline(options, notifyStatus);

        expect(createImagePipelineResource).toHaveBeenCalledWith(options, gitParams);
      });

      test('should get pipeline name', async () => {
        const options = {pipelineNamespace, templateNamespace, pipelineName};
        await classUnderTest.registerPipeline(options, notifyStatus);

        expect(getPipelineName).toHaveBeenCalledWith(templateNamespace, pipelineName);
      });

      test('should create pipeline run', async () => {
        await classUnderTest.registerPipeline({pipelineNamespace, templateNamespace}, notifyStatus);

        expect(createPipelineRun).toHaveBeenCalledWith({
          pipelineNamespace,
          name: repoName,
          gitSource: gitName,
          dockerImage: imageName,
          pipelineName: newPipelineName,
          serviceAccount,
        });
      });

      describe('and when pipelineName is `none`', () => {
        beforeEach(() => {
          getPipelineName.mockResolvedValueOnce('none');
        });

        test('should not create pipeline run', async () => {
          await classUnderTest.registerPipeline({pipelineNamespace, templateNamespace}, notifyStatus);

          expect(createPipelineRun).not.toHaveBeenCalled();
        });
      })
    });

    describe('when namespace does not exist', () => {
      beforeEach(() => {
        getClusterType.mockResolvedValue({clusterType: 'clusterType'});
        kubeNamespace_exists.mockResolvedValue(false);
      });

      test('then throw an error', async () => {
        let options = {pipelineNamespace, templateNamespace};
        return classUnderTest.registerPipeline(options, notifyStatus)
          .then(value => fail('should throw error'))
          .catch(error => {
            expect(error.message).toContain('The pipeline namespace does not exist');
          });
      });
    });
  });

  describe('given createGitPipelineResource()', () => {
    let buildGitPipelineResourceBody: Mock;
    beforeEach(() => {
      buildGitPipelineResourceBody = mockField(classUnderTest, 'buildGitPipelineResourceBody');
    });

    describe('when called', () => {
      test('should create git PipelineResource', async () => {
        const pipelineNamespace = 'namespace';
        const gitParams: GitParams = {
          url: 'git-url',
          branch: 'git-branch',
          username: 'git username',
          password: 'git password',
          org: 'git-org',
          repo: 'git-repo',
          name: 'git-org.git-repo',
        };
        const body = {body: {}};
        buildGitPipelineResourceBody.mockReturnValue(body);

        await classUnderTest.createGitPipelineResource({pipelineNamespace, templateNamespace: 'ns'}, gitParams);

        expect(kubePipelineResource.createOrUpdate).toHaveBeenCalledWith(`${gitParams.repo}-git`, body, pipelineNamespace);
        expect(buildGitPipelineResourceBody).toHaveBeenCalledWith(`${gitParams.repo}-git`, {
          url: gitParams.url,
          revision: gitParams.branch,
        });
      });
    });
  });

  describe('given createImagePipelineResource()', () => {
    let buildImagePipelineResourceBody: Mock;
    let buildImageUrl: Mock;
    beforeEach(() => {
      buildImagePipelineResourceBody = mockField(classUnderTest, 'buildImagePipelineResourceBody');
      buildImageUrl = mockField(classUnderTest, 'buildImageUrl');
    });

    describe('when called', function () {
      test('should create image PipelineResource', async () => {
        const pipelineNamespace = 'namespace';
        const params = {
          repo: 'git-repo',
        };

        const body = {body: {}};
        buildImagePipelineResourceBody.mockReturnValue(body);

        const imageUrl = 'image url';
        buildImageUrl.mockResolvedValue(imageUrl);

        let options = {pipelineNamespace, templateNamespace: 'ns'};
        await classUnderTest.createImagePipelineResource(options, params);

        expect(kubePipelineResource.createOrUpdate).toHaveBeenCalledWith(`${params.repo}-image`, body, pipelineNamespace);
        expect(buildImagePipelineResourceBody).toHaveBeenCalledWith(`${params.repo}-image`, imageUrl);
        expect(buildImageUrl).toHaveBeenCalledWith(options, params);
      });
    });
  })

  describe('given buildImageUrl()', () => {
    describe('when registry url and namespace set', () => {
      const registryUrl = 'registry-url';
      const registryNamespace = 'registry-ns';
      beforeEach(() => {
        let ibmcloudConfig: ConfigMap<IBMCloudConfig> = {
          metadata: {
            name: 'ibmcloud-config',
          },
          data: {
            REGISTRY_URL: registryUrl,
            REGISTRY_NAMESPACE: registryNamespace,
          } as any
        };

        (kubeConfigMap.get as Mock).mockResolvedValue(ibmcloudConfig);
      });

      test('should get registry url from config map', async () => {
        const options = {pipelineNamespace: 'pipeline', templateNamespace: 'template'};
        const repo = 'git-repo';

        const url = await classUnderTest.buildImageUrl(options, {repo});

        expect(url).toEqual(`${registryUrl}/${registryNamespace}/${repo}:latest`);
        expect(kubeConfigMap.get).toHaveBeenCalledWith('ibmcloud-config', options.templateNamespace);
      });
    });

    describe('when registry namespace not set', () => {
      const registryUrl = 'registry-url';
      beforeEach(() => {
        let ibmcloudConfig: ConfigMap<IBMCloudConfig> = {
          metadata: {
            name: 'ibmcloud-config',
          },
          data: {
            REGISTRY_URL: registryUrl,
          } as any
        };

        (kubeConfigMap.get as Mock).mockResolvedValue(ibmcloudConfig);
      });

      test('should get default registry namespace to pipeline namespace', async () => {
        const options = {pipelineNamespace: 'pipeline', templateNamespace: 'template'};
        const repo = 'git-repo';

        const url = await classUnderTest.buildImageUrl(options, {repo});

        expect(url).toEqual(`${registryUrl}/${options.pipelineNamespace}/${repo}:latest`);
        expect(kubeConfigMap.get).toHaveBeenCalledWith('ibmcloud-config', options.templateNamespace);
      });
    });

    describe('when configmap not found', () => {
      test('should throw error',  () => {
        const options = {pipelineNamespace: 'pipeline', templateNamespace: 'template'};
        const repo = 'git-repo';

        return classUnderTest.buildImageUrl(options, {repo})
          .then(
            result => fail('Should throw error'),
            error => {
              expect(error.message).toEqual('Unable to retrieve config map: ibmcloud-config');
            }
          );
      });
    });
  });

  describe('given createPipelineRun()', () => {
    describe('when called', () => {
      test('create PipelineRun instance', async () => {
        const pipelineNamespace = 'pipeline-namespace';
        const name = 'project-name';
        const gitSource = 'git-source';
        const dockerImage = 'docker-image';
        const pipelineName = 'pipeline-name';
        const serviceAccount = 'service-account';

        await classUnderTest.createPipelineRun({
          pipelineNamespace,
          name,
          gitSource,
          dockerImage,
          pipelineName,
          serviceAccount,
        });

        expect(kubePipelineRun.create).toHaveBeenCalled();
      });
    })
  })
});