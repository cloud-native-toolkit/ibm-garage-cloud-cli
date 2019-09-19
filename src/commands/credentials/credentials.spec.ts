import {Container} from 'typescript-ioc';
import {Credentials, CredentialsImpl, Secrets} from './credentials';
import {KubeConfigMap, KubeSecret} from '../../api/kubectl';
import Mock = jest.Mock;
import {mockField, providerFromValue} from '../../testHelper';
import {KubeClient} from '../../api/kubectl/client';
import {buildMockKubeClient} from '../../api/kubectl/testHelper';

describe('credentials', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  test('Container.get(Credentials) should return value', () => {
    expect(Container.get(Credentials)).not.toBeUndefined();
  });

  describe('given Credentials', () => {
    let classUnderTest: CredentialsImpl;
    let mock_getSecretData: Mock;
    let mock_kubeClient: KubeClient;

    beforeEach(() => {
      mock_getSecretData = jest.fn();
      Container.bind(KubeSecret).provider(providerFromValue({getData: mock_getSecretData}));

      mock_kubeClient = buildMockKubeClient();
      Container.bind(KubeClient).provider(providerFromValue(mock_kubeClient));

      classUnderTest = Container.get(CredentialsImpl);
    });

    describe('given getCredentials()', () => {

      let mock_configMaps: Mock;
      let unset_configMaps: () => void;

      let mock_getArgoCdCredentials: Mock;
      let unset_getArgoCdCredentials: () => void;

      let mock_flatten: Mock;
      let unset_flatten: () => void;

      let mock_group: Mock;
      let unset_group: () => void;

      let mock_secrets: Mock;
      let unset_secrets: () => void;

      beforeEach(() => {

        mock_configMaps = jest.fn();
        unset_configMaps = mockField(classUnderTest, 'configMaps', mock_configMaps);

        mock_secrets = jest.fn();
        unset_secrets = mockField(classUnderTest,'secrets', mock_secrets);

        mock_getArgoCdCredentials = jest.fn();
        unset_getArgoCdCredentials = mockField(classUnderTest, 'getArgoCdCredentials', mock_getArgoCdCredentials);

        mock_flatten = jest.fn();
        unset_flatten = mockField(classUnderTest, 'flatten', mock_flatten);

        mock_group = jest.fn();
        unset_group = mockField(classUnderTest, 'group', mock_group);
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
          await classUnderTest.getCredentials(namespace);

          expect(mock_configMaps).toHaveBeenCalledWith(['jenkins-config', 'sonarqube-config', 'artifactory-config', 'argocd-config'], namespace);
        });

        test('should call getSecretData() for jenkins-access, sonarqube-access, artifactory-access', async () => {

          const namespace = 'namespace';
          await classUnderTest.getCredentials(namespace);

          expect(mock_secrets).toHaveBeenCalledWith(['sonarqube-access', 'artifactory-access'], namespace);
        });

        test('should call getArgoCdCredentials()', async () => {

          const namespace = 'namespace';
          await classUnderTest.getCredentials(namespace);

          expect(mock_getArgoCdCredentials).toHaveBeenCalledWith(namespace);
        });

        test('should pass results from ConfigMap, Secret, and ArgoCdCredentials to flatten()', async () => {

          const namespace = 'namespace';
          await classUnderTest.getCredentials(namespace);

          expect(mock_flatten).toHaveBeenCalledWith(credentialCollection);
        });

        test('should pass flattened credentials into group()', async () => {

          const namespace = 'namespace';
          const result = await classUnderTest.getCredentials(namespace);

          expect(result).toBe(secrets);
          expect(mock_group).toHaveBeenCalledWith(credentials);
        });
      });
    });

    describe('given configMaps()', () => {

      let mock_getConfigMapData: Mock;

      beforeEach(() => {
        mock_getConfigMapData = jest.fn();
        Container.bind(KubeConfigMap).provider({get: () => ({getData: mock_getConfigMapData})});
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
          classUnderTest.configMaps([map1, map2], namespace);

          expect(mock_getConfigMapData).toHaveBeenCalledTimes(2);
          expect(mock_getConfigMapData.mock.calls[0][0]).toEqual(map1);
          expect(mock_getConfigMapData.mock.calls[0][1]).toEqual(namespace);
          expect(mock_getConfigMapData.mock.calls[1][0]).toEqual(map2);
          expect(mock_getConfigMapData.mock.calls[1][1]).toEqual(namespace);
        });

        test('should return an array of resolved values', async () => {
          const namespace = 'namespace';
          const result = await Promise.all(classUnderTest.configMaps(['a', 'b'], namespace));

          expect(result).toEqual([expectedResult, expectedResult]);
        });
      });

      describe('when getConfigMapData() is rejected', () => {
        beforeEach(() => {
          mock_getConfigMapData.mockReturnValue(Promise.reject(new Error('error')));
        });

        test('should return an array of resolved values', async () => {
          const namespace = 'namespace';
          const result = await Promise.all(classUnderTest.configMaps(['a', 'b'], namespace));

          expect(result).toEqual([{}, {}]);
        });
      });
    });

    describe('given secrets()', () => {

      describe('when getSecretData() resolves successfully', () => {
        const expectedResult = {JENKINS_URL: 'url'};

        beforeEach(() => {
          mock_getSecretData.mockResolvedValue(expectedResult);
        });

        test('should call getSecretData() for each value in array', async () => {
          const map1 = 'a';
          const map2 = 'b';

          const namespace = 'namespace';
          classUnderTest.secrets([map1, map2], namespace);

          expect(mock_getSecretData).toHaveBeenCalledTimes(2);
          expect(mock_getSecretData.mock.calls[0][0]).toEqual(map1);
          expect(mock_getSecretData.mock.calls[0][1]).toEqual(namespace);
          expect(mock_getSecretData.mock.calls[1][0]).toEqual(map2);
          expect(mock_getSecretData.mock.calls[1][1]).toEqual(namespace);
        });

        test('should return an array of resolved values', async () => {
          const namespace = 'namespace';
          const result = await Promise.all(classUnderTest.secrets(['a', 'b'], namespace));

          expect(result).toEqual([expectedResult, expectedResult]);
        });
      });

      describe('when getSecretData() is rejected', () => {
        beforeEach(() => {
          mock_getSecretData.mockRejectedValue(new Error('error'));
        });

        test('should return an array of resolved values', async () => {
          const namespace = 'namespace';
          const result = await Promise.all(classUnderTest.secrets(['a', 'b'], namespace));

          expect(result).toEqual([{}, {}]);
        });
      });
    });

    describe('given flatten()', () => {

      describe('when called with undefined', () => {
        test('return an empty object', () => {
          expect(classUnderTest.flatten(undefined)).toEqual({});
        });
      });

      describe('when called with an empty array', () => {
        test('return an empty object', () => {
          expect(classUnderTest.flatten([])).toEqual({});
        });
      });

      describe('when called with an array of object', () => {
        test('return a flattened object', () => {
          const JENKINS_URL = 'JENKINS_URL';
          const JENKINS_USER = 'JENKINS_USER';
          const SONARQUBE_URL = 'SONARQUBE_URL';

          expect(classUnderTest.flatten([{JENKINS_URL}, {JENKINS_USER}, {SONARQUBE_URL}])).toEqual({JENKINS_URL, JENKINS_USER, SONARQUBE_URL})
        });
      });
    });

    describe('given group()', () => {
      describe('when called with empty object', () => {
        test('return empty object', () => {
          expect(classUnderTest.group({})).toEqual({});
        });
      });

      describe('when called with keys having format <group>_<type>', () => {
        test('return <group>: {<type>: <value>} as lowercase', () => {
          expect(classUnderTest.group({JENKINS_URL: 'url', JENKINS_USER: 'user'})).toEqual({jenkins: {url: 'url', user: 'user'}});
        });
      });

      describe('when called with keys not containing underscore', () => {
        test('ignore the key', () => {
          expect(classUnderTest.group({JENKINSURL: 'url', JENKINS_USER: 'user'} as any)).toEqual({jenkins: {user: 'user'}});
        });
      })
    });
  });
});
