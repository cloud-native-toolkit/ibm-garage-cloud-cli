import {IBMCloudConfig, RegisterTektonPipeline} from './register-tekton-pipeline';
import {Container} from 'typescript-ioc';
import {CreateGitSecret, GitParams} from '../git-secret';
import {mockField, providerFromValue} from '../../testHelper';
import Mock = jest.Mock;
import {Namespace} from '../namespace';
import {KubeTektonPipelineResource} from '../../api/kubectl/tekton-pipeline-resource';
import {ConfigMap, KubeConfigMap} from '../../api/kubectl';
import {buildOptionWithEnvDefault} from '../../util/yargs-support';
import {KubeTektonPipelineRun} from '../../api/kubectl/tekton-pipeline-run';

describe('register-tekton-pipeline', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  let classUnderTest: RegisterTektonPipeline;
  let createGitSecret: CreateGitSecret;
  let kubePipelineResource: KubeTektonPipelineResource;
  let kubePipelineRun: KubeTektonPipelineRun;
  let kubeConfigMap: KubeConfigMap;
  let namespaceBuilder: Namespace;
  beforeEach(() => {
    createGitSecret = {
      getGitParameters: jest.fn()
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

    classUnderTest = Container.get(RegisterTektonPipeline);
  });

  describe('given registerPipeline()', () => {
    let setupNamespace: Mock;
    let createServiceAccount: Mock;
    let createGitPipelineResource: Mock;
    let createImagePipelineResource: Mock;
    let getPipelineName: Mock;
    let createPipelineRun: Mock;
    beforeEach(() => {
      setupNamespace = mockField(classUnderTest, 'setupNamespace');
      createServiceAccount = mockField(classUnderTest, 'createServiceAccount');
      createGitPipelineResource = mockField(classUnderTest, 'createGitPipelineResource');
      createImagePipelineResource = mockField(classUnderTest, 'createImagePipelineResource');
      getPipelineName = mockField(classUnderTest, 'getPipelineName');
      createPipelineRun = mockField(classUnderTest, 'createPipelineRun');
    });

    describe('when called', () => {
      const pipelineNamespace = 'test';
      const templateNamespace = 'tools;';
      const notifyStatus = (text: string) => undefined;

      const repoName = 'repoName';
      const gitName = 'gitName';
      const imageName = 'imageName';
      const pipelineName = 'pipelineName';

      const gitParams = {repo: repoName};

      beforeEach(() => {
        (createGitSecret.getGitParameters as Mock).mockResolvedValue(gitParams);
        createGitPipelineResource.mockResolvedValue(gitName);
        createImagePipelineResource.mockResolvedValue(imageName);
        getPipelineName.mockResolvedValue(pipelineName);
      });

      test('should get git parameters', async () => {
        let options = {pipelineNamespace, templateNamespace};
        await classUnderTest.registerPipeline(options, notifyStatus);

        expect(createGitSecret.getGitParameters).toHaveBeenCalledWith(options);
      });

      test('should setup namespaces', async () => {
        await classUnderTest.registerPipeline({pipelineNamespace, templateNamespace}, notifyStatus);

        expect(setupNamespace).toHaveBeenCalledWith(pipelineNamespace, templateNamespace, notifyStatus);
      });

      test('should setup serviceAccount', async () => {
        await classUnderTest.registerPipeline({pipelineNamespace, templateNamespace}, notifyStatus);

        expect(createServiceAccount).toHaveBeenCalledWith(pipelineNamespace, 'pipeline', notifyStatus);
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

        expect(getPipelineName).toHaveBeenCalledWith(pipelineNamespace, pipelineName);
      });

      test('should create pipeline run', async () => {
        await classUnderTest.registerPipeline({pipelineNamespace, templateNamespace}, notifyStatus);

        expect(createPipelineRun).toHaveBeenCalledWith({
          pipelineNamespace,
          name: repoName,
          gitSource: gitName,
          dockerImage: imageName,
          pipelineName,
          serviceAccount: 'pipeline',
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
  });

  describe('given setupNamespace()', () => {
    const notifyStatus = () => undefined;
    describe('when toNamespace equals fromNamespace', () => {
      test('should not call namespaceBuilder', () => {
        const namespace = 'namespace';
        classUnderTest.setupNamespace(namespace, namespace, notifyStatus);

        expect(namespaceBuilder.create).not.toHaveBeenCalled();
      });
    });

    describe('when toNamespace not equal to fromNamespace', () => {
      test('should call namespaceBuilder create()', () => {
        const toNamespace = 'toNamespace';
        const fromNamespace = 'fromNamespace';
        classUnderTest.setupNamespace(toNamespace, fromNamespace, notifyStatus);

        expect(namespaceBuilder.create).toHaveBeenCalledWith(toNamespace, fromNamespace, notifyStatus);
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
          username: gitParams.username,
          password: gitParams.password,
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