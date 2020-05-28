import {Container} from 'typescript-ioc';
import {Credentials} from './credentials.api';
import {CredentialsImpl} from './credentials';
import {KubeConfigMap, KubeSecret} from '../../api/kubectl';
import {factoryFromValue} from '../../testHelper';
import Mock = jest.Mock;

describe('credentials', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  test('Container.get(Credentials) should return value', () => {
    expect(Container.get(Credentials)).not.toBeUndefined();
  });

  describe('given Credentials', () => {
    let classUnderTest: CredentialsImpl;

    let secret_listData: Mock;
    let configMap_listData: Mock;

    beforeEach(() => {
      secret_listData = jest.fn();
      Container.bind(KubeSecret).factory(factoryFromValue({
        listData: secret_listData,
      }));

      configMap_listData = jest.fn();
      Container.bind(KubeConfigMap).factory(factoryFromValue({
        listData: configMap_listData,
      }));

      classUnderTest = Container.get(CredentialsImpl);
    });

    describe('given getCredentials()', () => {
      let getArgoCdCredentials: Mock;
      let getJenkinsCredentials: Mock;
      let group: Mock;
      beforeEach(() => {
        classUnderTest.getArgoCdCredentials = getArgoCdCredentials = jest.fn();
        classUnderTest.getJenkinsCredentials = getJenkinsCredentials = jest.fn();
        classUnderTest.group = group = jest.fn();
      });

      describe('when called', () => {
        test('then combine configMaps, secrets, and ArgoCd credentials', async () => {

          const configMapData = [{JENKINS_URL: 'jenkins url'}, {ARTIFACTORY_URL: 'artifactory url'}];
          configMap_listData.mockResolvedValue(configMapData);

          const secretData = [{JENKINS_USER: 'jenkins user'}, {ARTIFACTORY_USER: 'artifactory user'}];
          secret_listData.mockResolvedValue(secretData);

          const argoCdCredentials = {ARGOCD_PASSWORD: 'password', ARGOCD_USER: 'argo user'};
          getArgoCdCredentials.mockResolvedValue(argoCdCredentials);

          const jenkinsCredentials = {JENKINS_PASSWORD: 'jpassword', JENKINS_USER: 'jenkins user'};
          getJenkinsCredentials.mockResolvedValue(jenkinsCredentials);

          const expectedResult = {};
          group.mockReturnValue(expectedResult);

          const namespace = 'namespace';
          const result = await classUnderTest.getCredentials(namespace);

          expect(result).toBe(expectedResult);
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
