import {Container} from 'typescript-ioc';
import {Credentials} from './credentials.api';
import {CredentialsImpl, processResults} from './credentials';
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

  describe('given processResults()', () => {
    describe('when called', () => {
      test('then return secrets', async () => {
        const objects = [
          {ARTIFACTORY_USERNAME: 'artifactory', ARTIFACTORY_PASSWORD: 'password1', ARTIFACTORY_URL: 'http://artifactory.tools.svc'},
          {SONARQUBE_USERNAME: 'sonarqube', SONARQUBE_PASSWORD: 'password2', SONARQUBE_URL: 'http://sonarqube.tools.svc'},
          {PACT_BROKER_URL: 'https://pact-broker.public.com'},
          {ARGOCD_URL: 'https://argocd.public.com'},
          {ARTIFACTORY_URL: 'https://artifactory.public.com'}
        ]

        const result = processResults(objects)

        expect(result).toEqual({
          artifactory: {username: 'artifactory', password: 'password1', url: 'https://artifactory.public.com'},
          sonarqube: {username: 'sonarqube', password: 'password2', url: 'http://sonarqube.tools.svc'},
          pact_broker: {url: 'https://pact-broker.public.com'},
          argocd: {url: 'https://argocd.public.com'}
        })
      });
    });
  });
});
