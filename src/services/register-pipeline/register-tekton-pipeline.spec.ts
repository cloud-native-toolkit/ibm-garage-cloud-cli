import {Container} from 'typescript-ioc';
import {RegisterPipelineOptions} from './register-pipeline.api';
import {IBMCloudConfig, RegisterTektonPipeline, RegistryAccess} from './register-tekton-pipeline';
import {CreateGitSecret, GitParams} from '../git-secret';
import {factoryFromValue, mockField} from '../../testHelper';
import {Namespace} from '../namespace';
import {
  ConfigMap,
  KubeConfigMap,
  KubeNamespace, KubeSecret,
  KubeTektonPipeline,
  KubeTektonPipelineResource,
  KubeTektonPipelineRun,
  KubeTektonTask, Secret
} from '../../api/kubectl';
import {ClusterType} from '../../util/cluster-type';
import Mock = jest.Mock;

describe('register-tekton-pipeline', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  let classUnderTest: RegisterTektonPipeline;
  let createGitSecret: CreateGitSecret;
  let kubePipeline: KubeTektonPipeline;
  let kubePipelineResource: KubeTektonPipelineResource;
  let kubePipelineRun: KubeTektonPipelineRun;
  let kubeSecret: KubeSecret;
  let namespaceBuilder: Namespace;
  let getClusterType: Mock;
  let kubeNamespace_exists: Mock;
  let namespace_getCurrentProject: Mock;
  let tektonTask_copyAll: Mock;
  let pipeline_copy: Mock;
  let namespaceService_setupJenkins: Mock;
  let namespaceService_getCurrentProject: Mock;
  beforeEach(() => {
    createGitSecret = {
      getParametersAndCreateSecret: jest.fn(),
    } as any;
    Container.bind(CreateGitSecret)
      .factory(factoryFromValue(createGitSecret));

    namespaceBuilder = {
      create: jest.fn(),
      getCurrentProject: jest.fn(),
      setCurrentProject: jest.fn(),
      setupJenkins: jest.fn(),
      pullSecret: jest.fn(),
    };
    Container.bind(Namespace)
      .factory(factoryFromValue(namespaceBuilder));

    kubePipelineResource = {
      createOrUpdate: jest.fn()
    } as any;
    Container.bind(KubeTektonPipelineResource)
      .factory(factoryFromValue(kubePipelineResource));

    kubePipeline = {
      copy: jest.fn(),
    } as any;
    Container.bind(KubeTektonPipeline)
      .factory(factoryFromValue(kubePipeline));

    kubePipelineRun = {
      create: jest.fn()
    } as any;
    Container.bind(KubeTektonPipelineRun)
      .factory(factoryFromValue(kubePipelineRun));

    kubeSecret = {
      getData: jest.fn(),
    } as any;
    Container.bind(KubeSecret)
      .factory(factoryFromValue(kubeSecret));

    getClusterType = jest.fn();
    Container.bind(ClusterType)
      .factory(factoryFromValue({ getClusterType }));

    kubeNamespace_exists = jest.fn();
    Container.bind(KubeNamespace)
      .factory(factoryFromValue({ exists: kubeNamespace_exists }));

    namespace_getCurrentProject = jest.fn();
    Container.bind(Namespace)
      .factory(factoryFromValue({ getCurrentProject: namespace_getCurrentProject }));

    tektonTask_copyAll = jest.fn();
    Container.bind(KubeTektonTask)
      .factory(factoryFromValue({ copyAll: tektonTask_copyAll }));

    pipeline_copy = jest.fn();
    Container.bind(KubeTektonPipeline)
      .factory(factoryFromValue({ copy: pipeline_copy }));

    namespaceService_setupJenkins = jest.fn();
    namespaceService_getCurrentProject = jest.fn();
    Container.bind(Namespace)
      .factory(factoryFromValue({
        setupJenkins: namespaceService_setupJenkins,
        getCurrentProject: namespaceService_getCurrentProject,
      }));

    classUnderTest = Container.get(RegisterTektonPipeline);
  });

  describe('given registerPipeline()', () => {
    let createServiceAccount: Mock;
    let getPipelineName: Mock;
    let createPipelineRun: Mock;
    let generatePipelineName: Mock;
    let createTriggerTemplate: Mock;
    let createTriggerBinding: Mock;
    let createTriggerEventListener: Mock;
    let createTriggerRoute: Mock;
    beforeEach(() => {
      createServiceAccount = mockField(classUnderTest, 'createServiceAccount');
      getPipelineName = mockField(classUnderTest, 'getPipelineArgs');
      createPipelineRun = mockField(classUnderTest, 'createPipelineRun');
      generatePipelineName = mockField(classUnderTest, 'generatePipelineName');
      createTriggerTemplate = mockField(classUnderTest, 'createTriggerTemplate');
      createTriggerBinding = mockField(classUnderTest, 'createTriggerBinding');
      createTriggerEventListener = mockField(classUnderTest, 'createTriggerEventListener');
      createTriggerRoute = mockField(classUnderTest, 'createTriggerRoute');
    });

    const pipelineNamespace = 'test';
    const templateNamespace = 'tools';
    const notifyStatus = (text: string) => undefined;

    describe('when namespace exists', () => {

      const repoName = 'repo-name';
      const gitName = 'gitName';
      const fullGitName = "org-name";
      const imageName = 'imageName';
      const pipelineName = 'pipelineName';
      const clusterType = 'clusterType';
      const serviceAccount = 'serviceAccount';
      const secretName = 'secretName';
      const newPipelineName = 'newPipelineName';
      const gitParams = { name: fullGitName, repo: repoName };

      beforeEach(() => {
        getClusterType.mockResolvedValue({ clusterType });
        kubeNamespace_exists.mockResolvedValue(true);
        (createGitSecret.getParametersAndCreateSecret as Mock).mockResolvedValue({ gitParams, secretName, configMapName: 'configMapName' });
        createServiceAccount.mockResolvedValue(serviceAccount);
        getPipelineName.mockResolvedValue(pipelineName);
        (kubePipeline.copy as Mock).mockResolvedValue({ metadata: { name: newPipelineName } });
        generatePipelineName.mockReturnValue(repoName);
        pipeline_copy.mockResolvedValue({ metadata: { name: newPipelineName } });
        createTriggerBinding.mockResolvedValue({ metadata: { name: 'triggerbinding' } });
        createTriggerTemplate.mockResolvedValue({ metadata: { name: 'triggertemplate' } });
        createTriggerRoute.mockResolvedValue({ spec: { host: 'el-pipeline.apps.example.com' } });
      });

      test('should get cluster type', async () => {
        let options = { pipelineNamespace, templateNamespace };
        await classUnderTest.registerPipeline(options, notifyStatus);

        expect(getClusterType).toHaveBeenCalledWith(pipelineNamespace);
      });

      test('should get git parameters', async () => {
        let options: RegisterPipelineOptions = { pipelineNamespace, templateNamespace, replaceGitSecret: false };
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
        await classUnderTest.registerPipeline({ pipelineNamespace, templateNamespace }, notifyStatus);

        expect(createServiceAccount).toHaveBeenCalledWith(pipelineNamespace, clusterType, [secretName], notifyStatus);
      });

      test('should get pipeline name', async () => {
        const options = { pipelineNamespace, templateNamespace, pipelineName };
        await classUnderTest.registerPipeline(options, notifyStatus);

        expect(getPipelineName).toHaveBeenCalledWith(templateNamespace, pipelineName);
      });

      test.skip('should create pipeline run', async () => {
        await classUnderTest.registerPipeline({ pipelineNamespace, templateNamespace }, notifyStatus);

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
          await classUnderTest.registerPipeline({ pipelineNamespace, templateNamespace }, notifyStatus);

          expect(createPipelineRun).not.toHaveBeenCalled();
        });
      })
    });

    describe('when namespace does not exist', () => {
      beforeEach(() => {
        getClusterType.mockResolvedValue({ clusterType: 'clusterType' });
        kubeNamespace_exists.mockResolvedValue(false);
      });

      test('then throw an error', async () => {
        let options = { pipelineNamespace, templateNamespace };
        return classUnderTest.registerPipeline(options, notifyStatus)
          .then(value => fail('should throw error'))
          .catch(error => {
            expect(error.message).toContain('The pipeline namespace does not exist');
          });
      });
    });
  });

  describe('given buildImageUrl()', () => {
    describe('when registry url and namespace set', () => {
      const registryUrl = 'registry-url';
      const registryNamespace = 'registry-ns';
      beforeEach(() => {
        let registryConfig: RegistryAccess = {
          REGISTRY_URL: registryUrl,
          REGISTRY_NAMESPACE: registryNamespace,
        };

        (kubeSecret.getData as Mock).mockResolvedValue(registryConfig);
      });

      test('should get registry url from secret', async () => {
        const options = { pipelineNamespace: 'pipeline', templateNamespace: 'template' };
        const repo = 'git-repo';

        const url = await classUnderTest.buildImageUrl(options, { repo });

        expect(url).toEqual(`${registryUrl}/${registryNamespace}/${repo}:latest`);
        expect(kubeSecret.getData).toHaveBeenCalledWith('registry-access', options.pipelineNamespace);
      });
    });

    describe('when registry namespace not set', () => {
      const registryUrl = 'registry-url';
      beforeEach(() => {
        let registryConfig: RegistryAccess = {
          REGISTRY_URL: registryUrl,
        };

        (kubeSecret.getData as Mock).mockResolvedValue(registryConfig);
      });

      test('should get default registry namespace to pipeline namespace', async () => {
        const options = { pipelineNamespace: 'pipeline', templateNamespace: 'template' };
        const repo = 'git-repo';

        const url = await classUnderTest.buildImageUrl(options, { repo });

        expect(url).toEqual(`${registryUrl}/${options.pipelineNamespace}/${repo}:latest`);
        expect(kubeSecret.getData).toHaveBeenCalledWith('registry-access', options.pipelineNamespace);
      });
    });

    describe('when secret not found', () => {
      test('should throw error', () => {
        const options = { pipelineNamespace: 'pipeline', templateNamespace: 'template' };
        const repo = 'git-repo';

        return classUnderTest.buildImageUrl(options, { repo })
          .then(
            result => fail('Should throw error'),
            error => {
              expect(error.message).toEqual('Unable to retrieve Image Registry secret (registry-access) in namespace: ' + options.pipelineNamespace);
            }
          );
      });
    });
  });

  describe('given generatePipelineRunName()', () => {
    describe('when repo name are short', () => {
      test('then return the two values', async () => {
        const repo = 'repo';
        expect(classUnderTest.generatePipelineName({ repo } as any))
          .toEqual(repo);
      });
    });
    describe('when repo contain capital letters', () => {
      test('then return lower case values', async () => {
        const repo = 'Repo';
        expect(classUnderTest.generatePipelineName({ repo } as any))
          .toEqual(repo.toLowerCase());
      });
    });
    describe('when repo contain periods', () => {
      test('then return value with dashes', async () => {
        const repo = 're.po';
        expect(classUnderTest.generatePipelineName({ repo } as any))
          .toEqual('re-po');
      });
    });
    describe('when repo contain multiple dashes together', () => {
      test('then return value with single dash', async () => {
        const repo = 're---po';
        expect(classUnderTest.generatePipelineName({ repo } as any))
          .toEqual('re-po');
      });
    });
    describe('when repo name is longer than 56 characters', () => {
      test('then return truncated value', async () => {
        const repo = 'ibm-gsi-ecosystem-inventory-management-ui-solution-dev-test';
        expect(classUnderTest.generatePipelineName({ repo } as any))
          .toEqual('i-g-ecosystem-inventory-management-ui-solution-dev-test');
      });
    });
  });
});
