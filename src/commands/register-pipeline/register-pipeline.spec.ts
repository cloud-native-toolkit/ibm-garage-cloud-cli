import {Container} from 'typescript-ioc';

import {KubeConfigMap, KubeSecret} from '../../api/kubectl';
import {mockField, providerFromValue} from '../../testHelper';
import {RegisterPipeline, RegisterPipelineImpl} from './register-pipeline';
import {FsPromises} from '../../util/file-util';
import {RegisterPipelineType} from './register-pipeline-type';
import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {GitParams} from './create-git-secret';
import Mock = jest.Mock;

describe('register-pipeline', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given RegisterPipeline', () => {
    let classUnderTest: RegisterPipelineImpl;

    let mock_readFilePromise: Mock;
    let mock_getConfigMapData: Mock;
    let mock_getSecretData: Mock;

    beforeEach(() => {
      mock_readFilePromise = jest.fn();
      Container.bind(FsPromises).provider(providerFromValue({readFile: mock_readFilePromise}));

      mock_getConfigMapData = jest.fn();
      Container.bind(KubeConfigMap).provider(providerFromValue({getData: mock_getConfigMapData}));

      mock_getSecretData = jest.fn();
      Container.bind(KubeSecret).provider(providerFromValue({getData: mock_getSecretData}));

      classUnderTest = Container.get(RegisterPipeline);
    });

    describe('readValuesFile()', () => {

      describe('when valuesFileName is undefined', () => {
        test('return empty object', async () => {
          expect(await classUnderTest.readValuesFile()).toEqual({});
        });
      });

      describe('when valuesFileName contains properties (key=value)', () => {
        test('parse properties and return object', async () => {
          const expectedResult = {key: 'value'};
          const fileName = '/test/file/path';

          mock_readFilePromise.mockResolvedValue('key=value');

          const actualResult = await classUnderTest.readValuesFile(fileName);

          expect(actualResult).toEqual(expectedResult);
        });
      });

      describe('when valuesFileName contains json', () => {
        test('parse json and return object', async () => {
          const expectedResult = {key: 'value'};
          const fileName = '/test/file/path';

          mock_readFilePromise.mockResolvedValue(JSON.stringify(expectedResult));

          const actualResult = await classUnderTest.readValuesFile(fileName);

          expect(actualResult).toEqual(expectedResult);
        });
      });

      describe('when valuesFileName contains yaml', () => {
        test('parse yaml and return object', async () => {
          const expectedResult = {key: 'value'};
          const fileName = '/test/file/path';

          mock_readFilePromise.mockResolvedValue("key: value");

          const actualResult = await classUnderTest.readValuesFile(fileName);

          expect(actualResult).toEqual(expectedResult);
        });
      });

      describe('when file not found', () => {
        test('return empty object', async () => {
          const fileName = '/file/path';

          mock_readFilePromise.mockRejectedValue(new Error('file not found'));

          expect(await classUnderTest.readValuesFile(fileName)).toEqual({});
        });
      });
    });

    describe('executeRegisterPipeline()', () => {
      let mock_getPipelineType: Mock;
      let unset_getPipelineType: () => void;

      let mock_registerPipeline: Mock  = jest.fn();

      beforeEach(() => {
        mock_getPipelineType = jest.fn();
        unset_getPipelineType = mockField(classUnderTest, 'getPipelineType', mock_getPipelineType);

        const pipeline: RegisterPipelineType = {
          registerPipeline: mock_registerPipeline,
        } as any;

        mock_getPipelineType.mockReturnValue(pipeline);
      });

      afterEach(() => {
        unset_getPipelineType();
      });

      describe('when called', () => {
        test('then get the pipeline and call registerPipeline()', async () => {
          const expectedResult = {};
          mock_registerPipeline.mockResolvedValue(expectedResult);

          const clusterType = 'clusterType' as any;
          const options: RegisterPipelineOptions = {} as any;
          const gitParams: GitParams = {} as any;
          expect(await classUnderTest.executeRegisterPipeline(clusterType, options, gitParams)).toBe(expectedResult);

          expect(mock_getPipelineType).toHaveBeenCalledWith(clusterType);
          expect(mock_registerPipeline).toHaveBeenCalledWith(options, gitParams);
        });
      });
    });

    describe('given getClusterType()', () => {

      describe('when ibmcloud-config ConfigMap exists', () => {
        const clusterType = 'cluster_type';
        beforeEach(() => {
          mock_getConfigMapData.mockResolvedValue({CLUSTER_TYPE: clusterType});
        });

        test('should read the cluster_type from `ibmcloud-config` ConfigMap in provided namespace', async () => {
          const namespace = 'namespace';
          const result = await classUnderTest.getClusterType(namespace);

          expect(mock_getConfigMapData).toHaveBeenCalledWith('ibmcloud-config', namespace);
          expect(result).toEqual(clusterType);
        });

        test('should read the cluster_type from `ibmcloud-config` ConfigMap in tools namespace if not provided', async () => {
          const clusterType = 'openshift';
          mock_getConfigMapData.mockResolvedValue({CLUSTER_TYPE: clusterType});

          await classUnderTest.getClusterType();

          expect(mock_getConfigMapData).toHaveBeenCalledWith('ibmcloud-config', 'tools');
        });

        describe('and when cluster_type is not defined', () => {
          test('should default to kubernetes', async () => {
            mock_getConfigMapData.mockResolvedValue({});

            expect(await classUnderTest.getClusterType()).toEqual('kubernetes');
          });
        })
      });

      describe('when retrieval of ibmcloud-config ConfigMap throws an error', () => {
        beforeEach(() => {
          mock_getConfigMapData.mockRejectedValue(new Error('unable to find configmap'));
        });

        test('should try to get the cluster type from the ibmcloud-apikey Secret in provided namespace', async () => {
          const clusterType = 'expected';
          mock_getSecretData.mockResolvedValue({cluster_type: clusterType});

          const namespace = 'namespace';
          expect(await classUnderTest.getClusterType(namespace)).toEqual(clusterType);

          expect(mock_getSecretData).toHaveBeenCalledWith('ibmcloud-apikey', namespace);
        });

        test('should try to get the cluster type from the ibmcloud-apikey Secret in `tools` namespace if not provided', async () => {
          const clusterType = 'expected';
          mock_getSecretData.mockResolvedValue({cluster_type: clusterType});

          await classUnderTest.getClusterType();

          expect(mock_getSecretData).toHaveBeenCalledWith('ibmcloud-apikey', 'tools');
        });

        test('should default to `kubernetes` if cluster_type not found', async () => {
          mock_getSecretData.mockResolvedValue({});

          expect(await classUnderTest.getClusterType()).toEqual('kubernetes');
        });

        describe('and when getSecretData throws an error', () => {
          test('should default to kubernetes', async () => {
            mock_getSecretData.mockRejectedValue(new Error('secret not found'));

            expect(await classUnderTest.getClusterType()).toEqual('kubernetes');
          });
        })
      });
    });

    describe('buildCreateWebhookOptions()', () => {
      test('map GitParams to CreateWebhookOptions', () => {
        const gitParams = {
          url: 'url',
          username: 'username',
          password: 'password'
        } as any;

        const pipelineResult = {
          jenkinsUrl: 'jenkinsUrl'
        };

        const result = classUnderTest.buildCreateWebhookOptions(gitParams, pipelineResult);

        expect(result.gitUrl).toEqual(gitParams.url);
        expect(result.gitUsername).toEqual(gitParams.username);
        expect(result.gitToken).toEqual(gitParams.password);
        expect(result.jenkinsUrl).toEqual(pipelineResult.jenkinsUrl);
      });
    });
  });
});
