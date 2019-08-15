import rewire = require('rewire');

const module = rewire('./register-pipeline');

const readValuesFile = module.__get__('readValuesFile');
const executeRegisterPipeline = module.__get__('executeRegisterPipeline');
const getClusterType = module.__get__('getClusterType');
const buildCreateWebhookOptions = module.__get__('buildCreateWebhookOptions');

describe('register-pipeline', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('readValuesFile()', () => {
    let mock_readFilePromise;
    let unset_readFilePromise;

    beforeEach(() => {
      mock_readFilePromise = jest.fn();
      unset_readFilePromise = module.__set__('readFilePromise', mock_readFilePromise);
    });

    afterEach(() => {
      unset_readFilePromise();
    });

    describe('when valuesFileName is undefined', () => {
      test('return empty object', async () => {
        expect(await readValuesFile()).toEqual({});
      });
    });

    describe('when valuesFileName contains properties (key=value)', () => {
      test('parse properties and return object', async () => {
        const expectedResult = {key: 'value'};
        const fileName = '/test/file/path';

        mock_readFilePromise.mockResolvedValue('key=value');

        const actualResult = await readValuesFile(fileName);

        expect(actualResult).toEqual(expectedResult);
      });
    });

    describe('when valuesFileName contains json', () => {
      test('parse json and return object', async () => {
        const expectedResult = {key: 'value'};
        const fileName = '/test/file/path';

        mock_readFilePromise.mockResolvedValue(JSON.stringify(expectedResult));

        const actualResult = await readValuesFile(fileName);

        expect(actualResult).toEqual(expectedResult);
      });
    });

    describe('when valuesFileName contains yaml', () => {
      test('parse yaml and return object', async () => {
        const expectedResult = {key: 'value'};
        const fileName = '/test/file/path';

        mock_readFilePromise.mockResolvedValue("key: value");

        const actualResult = await readValuesFile(fileName);

        expect(actualResult).toEqual(expectedResult);
      });
    });

    describe('when file not found', () => {
      test('return empty object', async () => {
        const fileName = '/file/path';

        mock_readFilePromise.mockRejectedValue(new Error('file not found'));

        expect(await readValuesFile(fileName)).toEqual({});
      });
    });
  });

  describe('executeRegisterPipeline()', () => {
    let mock_executeRegisterIksPipeline;
    let unset_executeRegisterIksPipeline;

    let mock_executeRegisterOpenShiftPipeline;
    let unset_executeRegisterOpenShiftPipeline;

    beforeEach(() => {

      mock_executeRegisterIksPipeline = jest.fn();
      unset_executeRegisterIksPipeline = module.__set__('executeRegisterIksPipeline', mock_executeRegisterIksPipeline) as () => void;

      mock_executeRegisterOpenShiftPipeline = jest.fn();
      unset_executeRegisterOpenShiftPipeline = module.__set__('executeRegisterOpenShiftPipeline', mock_executeRegisterOpenShiftPipeline) as () => void;
    });

    afterEach(() => {
      unset_executeRegisterIksPipeline();
      unset_executeRegisterOpenShiftPipeline();
    });

    describe('when cluster_type is `openshift`', () => {
      test('return value from executeRegisterOpenShiftPipeline()', async () => {
        const clusterType = 'openshift';
        const options = {};
        const gitParams = {};

        const executeRegisterOpenShiftPipelineResult = {};
        mock_executeRegisterOpenShiftPipeline.mockResolvedValue(executeRegisterOpenShiftPipelineResult);

        expect(await executeRegisterPipeline(clusterType, options, gitParams)).toBe(executeRegisterOpenShiftPipelineResult);

        expect(mock_executeRegisterOpenShiftPipeline.mock.calls.length).toBe(1);
        expect(mock_executeRegisterOpenShiftPipeline.mock.calls[0][0]).toBe(options);
        expect(mock_executeRegisterOpenShiftPipeline.mock.calls[0][1]).toBe(gitParams);
      });
    });

    describe('when cluster_type is `kubernetes`', () => {
      test('return value from executeRegisterIksPipeline()', async () => {
        const clusterType = 'kubernetes';
        const options = {};
        const gitParams = {};

        const executeRegisterIksPipelineResult = {};
        mock_executeRegisterIksPipeline.mockResolvedValue(executeRegisterIksPipelineResult);

        expect(await executeRegisterPipeline(clusterType, options, gitParams)).toBe(executeRegisterIksPipelineResult);

        expect(mock_executeRegisterIksPipeline.mock.calls.length).toBe(1);
        expect(mock_executeRegisterIksPipeline.mock.calls[0][0]).toBe(options);
        expect(mock_executeRegisterIksPipeline.mock.calls[0][1]).toBe(gitParams);
      });
    });
  });

  describe('getClusterType()', () => {
    let mock_getConfigMapData;
    let unset_getConfigMapData;

    let mock_getSecretData;
    let unset_getSecretData;

    beforeEach(() => {
      mock_getConfigMapData = jest.fn();
      unset_getConfigMapData = module.__set__('getConfigMapData', mock_getConfigMapData) as () => void;

      mock_getSecretData = jest.fn();
      unset_getSecretData = module.__set__('getSecretData', mock_getSecretData) as () => void;
    });

    afterEach(() => {
      unset_getConfigMapData();
      unset_getSecretData();
    });

    describe('when ibmcloud-config ConfigMap exists', () => {

      test('should read the cluster_type from `ibmcloud-config` ConfigMap in provided namespace', async () => {
        const clusterType = 'openshift';
        mock_getConfigMapData.mockResolvedValue({CLUSTER_TYPE: clusterType});

        const namespace = 'namespace';
        expect(await getClusterType(namespace)).toEqual(clusterType);

        expect(mock_getConfigMapData).toHaveBeenCalledWith('ibmcloud-config', namespace);
      });

      test('should read the cluster_type from `ibmcloud-config` ConfigMap in tools namespace if not provided', async () => {
        const clusterType = 'openshift';
        mock_getConfigMapData.mockResolvedValue({CLUSTER_TYPE: clusterType});

        await getClusterType();

        expect(mock_getConfigMapData).toHaveBeenCalledWith('ibmcloud-config', 'tools');
      });

      describe('and when cluster_type is not defined', () => {
        test('should default to kubernetes', async () => {
          mock_getConfigMapData.mockResolvedValue({});

          expect(await getClusterType()).toEqual('kubernetes');
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
        expect(await getClusterType(namespace)).toEqual(clusterType);

        expect(mock_getSecretData).toHaveBeenCalledWith('ibmcloud-apikey', namespace);
      });

      test('should try to get the cluster type from the ibmcloud-apikey Secret in `tools` namespace if not provided', async () => {
        const clusterType = 'expected';
        mock_getSecretData.mockResolvedValue({cluster_type: clusterType});

        await getClusterType();

        expect(mock_getSecretData).toHaveBeenCalledWith('ibmcloud-apikey', 'tools');
      });

      test('should default to `kubernetes` if cluster_type not found', async () => {
        mock_getSecretData.mockResolvedValue({});

        expect(await getClusterType()).toEqual('kubernetes');
      });

      describe('and when getSecretData throws an error', () => {
        test('should default to kubernetes', async () => {
          mock_getSecretData.mockRejectedValue(new Error('secret not found'));

          expect(await getClusterType()).toEqual('kubernetes');
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
      };

      const pipelineResult = {
        jenkinsUrl: 'jenkinsUrl'
      };

      const result = buildCreateWebhookOptions(gitParams, pipelineResult);

      expect(result.gitUrl).toEqual(gitParams.url);
      expect(result.gitUsername).toEqual(gitParams.username);
      expect(result.gitToken).toEqual(gitParams.password);
      expect(result.jenkinsUrl).toEqual(pipelineResult.jenkinsUrl);
    });
  });
});
