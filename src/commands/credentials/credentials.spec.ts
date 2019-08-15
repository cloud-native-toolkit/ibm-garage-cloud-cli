import rewire = require('rewire');
import {Secrets} from './credentials';

const module = rewire('./credentials');

const getCredentials = module.__get__('getCredentials');
const configMaps = module.__get__('configMaps');
const secrets = module.__get__('secrets');
const flatten = module.__get__('flatten');
const group = module.__get__('group');

describe('credentials', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given getCredentials()', () => {

    let mock_getSecretData;
    let unset_getSecretData;

    let mock_configMaps;
    let unset_configMaps;

    let mock_getArgoCdCredentials;
    let unset_getArgoCdCredentials;

    let mock_flatten;
    let unset_flatten;

    let mock_group;
    let unset_group;

    let mock_secrets;
    let unset_secrets;

    beforeEach(() => {
      mock_getSecretData = jest.fn();
      unset_getSecretData = module.__set__('getSecretData', mock_getSecretData) as () => void;

      mock_configMaps = jest.fn();
      unset_configMaps = module.__set__('configMaps', mock_configMaps) as () => void;

      mock_secrets = jest.fn();
      unset_secrets = module.__set__('secrets', mock_secrets) as () => void;

      mock_getArgoCdCredentials = jest.fn();
      unset_getArgoCdCredentials = module.__set__('getArgoCdCredentials', mock_getArgoCdCredentials) as () => void;

      mock_flatten = jest.fn();
      unset_flatten = module.__set__('flatten', mock_flatten) as () => void;

      mock_group = jest.fn();
      unset_group = module.__set__('group', mock_group) as () => void;
    });

    afterEach(() => {
      unset_secrets();
      unset_configMaps();
      unset_getArgoCdCredentials();
      unset_flatten();
      unset_group();
    });

    describe('when called', () => {
      const credentialCollection = [{}, {}, {}, {}, {}, {}, {}, {}];
      const credentials = {JENKINS_URL: 'https://jenkins.cloud'};
      const secrets: Secrets = {jenkins: {}};

      beforeEach(() => {
        mock_getSecretData.mockResolvedValue({});
        mock_secrets.mockReturnValue([Promise.resolve({}), Promise.resolve({})]);
        mock_configMaps.mockReturnValue([Promise.resolve({}), Promise.resolve({}), Promise.resolve({}), Promise.resolve({})]);
        mock_getArgoCdCredentials.mockResolvedValue({});

        mock_flatten.mockReturnValue(credentials);
        mock_group.mockReturnValue(secrets);
      });

      test('should call configMaps() for jenkins-config, sonarqube-config, artifactory-config, argocd-config', async () => {

        const namespace = 'namespace';
        await getCredentials(namespace);

        expect(mock_configMaps).toHaveBeenCalledWith(['jenkins-config', 'sonarqube-config', 'artifactory-config', 'argocd-config'], namespace);
      });

      test('should call getSecretData() for jenkins-access, sonarqube-access, artifactory-access', async () => {

        const namespace = 'namespace';
        await getCredentials(namespace);

        expect(mock_secrets).toHaveBeenCalledWith(['sonarqube-access', 'artifactory-access'], namespace);
      });

      test('should call getArgoCdCredentials()', async () => {

        const namespace = 'namespace';
        await getCredentials(namespace);

        expect(mock_getArgoCdCredentials).toHaveBeenCalledWith(namespace);
      });

      test('should pass results from ConfigMap, Secret, and ArgoCdCredentials to flatten()', async () => {

        const namespace = 'namespace';
        await getCredentials(namespace);

        expect(mock_flatten).toHaveBeenCalledWith(credentialCollection);
      });

      test('should pass flattened credentials into group()', async () => {

        const namespace = 'namespace';
        const result = await getCredentials(namespace);

        expect(result).toBe(secrets);
        expect(mock_group).toHaveBeenCalledWith(credentials);
      });
    });
  });

  describe('given configMaps()', () => {

    let mock_getConfigMapData;
    let unset_getConfigMapData;

    beforeEach(() => {
      mock_getConfigMapData = jest.fn();
      unset_getConfigMapData = module.__set__('getConfigMapData', mock_getConfigMapData) as () => void;
    });

    afterEach(() => {
      unset_getConfigMapData();
    });

    describe('when getConfigMapData() resolves successfully', () => {
      const expectedResult = {JENKINS_URL: 'url'};

      beforeEach(() => {
        mock_getConfigMapData.mockResolvedValue(expectedResult);
      });

      test('should call getConfigMapData() for each value in array', async () => {
        const map1 = 'a';
        const map2 = 'b';

        const namespace = 'namespace';
        configMaps([map1, map2], namespace);

        expect(mock_getConfigMapData).toHaveBeenCalledTimes(2);
        expect(mock_getConfigMapData.mock.calls[0][0]).toEqual(map1);
        expect(mock_getConfigMapData.mock.calls[0][1]).toEqual(namespace);
        expect(mock_getConfigMapData.mock.calls[1][0]).toEqual(map2);
        expect(mock_getConfigMapData.mock.calls[1][1]).toEqual(namespace);
      });

      test('should return an array of resolved values', async () => {
        const namespace = 'namespace';
        const result = await Promise.all(configMaps(['a', 'b'], namespace));

        expect(result).toEqual([expectedResult, expectedResult]);
      });
    });

    describe('when getConfigMapData() is rejected', () => {
      beforeEach(() => {
        mock_getConfigMapData.mockReturnValue(Promise.reject(new Error('error')));
      });

      test('should return an array of resolved values', async () => {
        const namespace = 'namespace';
        const result = await Promise.all(configMaps(['a', 'b'], namespace));

        expect(result).toEqual([{}, {}]);
      });
    });
  });

  describe('given secrets()', () => {

    let mock_getSecretData;
    let unset_getSecretData;

    beforeEach(() => {
      mock_getSecretData = jest.fn();
      unset_getSecretData = module.__set__('getSecretData', mock_getSecretData) as () => void;
    });

    afterEach(() => {
      unset_getSecretData();
    });

    describe('when getSecretData() resolves successfully', () => {
      const expectedResult = {JENKINS_URL: 'url'};

      beforeEach(() => {
        mock_getSecretData.mockResolvedValue(expectedResult);
      });

      test('should call getSecretData() for each value in array', async () => {
        const map1 = 'a';
        const map2 = 'b';

        const namespace = 'namespace';
        secrets([map1, map2], namespace);

        expect(mock_getSecretData).toHaveBeenCalledTimes(2);
        expect(mock_getSecretData.mock.calls[0][0]).toEqual(map1);
        expect(mock_getSecretData.mock.calls[0][1]).toEqual(namespace);
        expect(mock_getSecretData.mock.calls[1][0]).toEqual(map2);
        expect(mock_getSecretData.mock.calls[1][1]).toEqual(namespace);
      });

      test('should return an array of resolved values', async () => {
        const namespace = 'namespace';
        const result = await Promise.all(secrets(['a', 'b'], namespace));

        expect(result).toEqual([expectedResult, expectedResult]);
      });
    });

    describe('when getSecretData() is rejected', () => {
      beforeEach(() => {
        mock_getSecretData.mockReturnValue(Promise.reject(new Error('error')));
      });

      test('should return an array of resolved values', async () => {
        const namespace = 'namespace';
        const result = await Promise.all(secrets(['a', 'b'], namespace));

        expect(result).toEqual([{}, {}]);
      });
    });
  });

  describe('given flatten()', () => {

    describe('when called with undefined', () => {
      test('return an empty object', () => {
        expect(flatten(undefined)).toEqual({});
      });
    });

    describe('when called with an empty array', () => {
      test('return an empty object', () => {
        expect(flatten([])).toEqual({});
      });
    });

    describe('when called with an array of object', () => {
      test('return a flattened object', () => {
        const JENKINS_URL = 'JENKINS_URL';
        const JENKINS_USER = 'JENKINS_USER';
        const SONARQUBE_URL = 'SONARQUBE_URL';

        expect(flatten([{JENKINS_URL}, {JENKINS_USER}, {SONARQUBE_URL}])).toEqual({JENKINS_URL, JENKINS_USER, SONARQUBE_URL})
      });
    });
  });

  describe('given group()', () => {
    describe('when called with empty object', () => {
      test('return empty object', () => {
        expect(group({})).toEqual({});
      });
    });

    describe('when called with keys having format <group>_<type>', () => {
      test('return <group>: {<type>: <value>} as lowercase', () => {
        expect(group({JENKINS_URL: 'url', JENKINS_USER: 'user'})).toEqual({jenkins: {url: 'url', user: 'user'}});
      });
    });

    describe('when called with keys not containing underscore', () => {
      test('ignore the key', () => {
        expect(group({JENKINSURL: 'url', JENKINS_USER: 'user'})).toEqual({jenkins: {user: 'user'}});
      });
    })
  });
});
