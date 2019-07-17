import rewire = require('rewire');
import {buildMockKubeClient} from '../../api/kubectl/testHelper';

const module = rewire('./credentials');

const getCredentials = module.__get__('getCredentials');
const getJenkinsInfo = module.__get__('getJenkinsInfo');
const getSonarqubeInfo = module.__get__('getSonarqubeInfo');
const getSonarqubeCredentials = module.__get__('getSonarqubeCredentials');
const getSonarqubeUrl = module.__get__('getSonarqubeUrl');
const getArgoCdInfo = module.__get__('getArgoCdInfo');
const getArgoCdUrl = module.__get__('getArgoCdUrl');

describe('credentials', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given getCredentials()', () => {

    let mock_getJenkinsInfo;
    let unset_getJenkinsInfo;

    let mock_getArgoCdInfo;
    let unset_getArgoCdInfo;

    let mock_getSonarqubeInfo;
    let unset_getSonarqubeInfo;

    beforeEach(() => {
      mock_getJenkinsInfo = jest.fn();
      unset_getJenkinsInfo = module.__set__('getJenkinsInfo', mock_getJenkinsInfo);

      mock_getArgoCdInfo = jest.fn();
      unset_getArgoCdInfo = module.__set__('getArgoCdInfo', mock_getArgoCdInfo);

      mock_getSonarqubeInfo = jest.fn();
      unset_getSonarqubeInfo = module.__set__('getSonarqubeInfo', mock_getSonarqubeInfo);
    });

    afterEach(() => {
      unset_getJenkinsInfo();
      unset_getArgoCdInfo();
      unset_getSonarqubeInfo();
    });

    describe('when called', () => {
      const jenkins = {username: 'jenkins'};
      const argocd = {username: 'argocd'};
      const sonarqube = {username: 'sonarqube'};

      beforeEach(() => {
        mock_getJenkinsInfo.mockResolvedValue(jenkins);
        mock_getArgoCdInfo.mockResolvedValue(argocd);
        mock_getSonarqubeInfo.mockResolvedValue(sonarqube);
      });

      test('returns values from jenkins, argocd, and sonarqube', async () => {
        expect(await getCredentials()).toEqual({jenkins, argocd, sonarqube});
      });
    });
  });

  describe('given getJenkinsInfo()', () => {
    let mock_getSecretData;
    let unset_getSecretData;

    beforeEach(() => {
      mock_getSecretData = jest.fn();
      unset_getSecretData = module.__set__('getSecretData', mock_getSecretData);
    });

    afterEach(() => {
      unset_getSecretData();
    });

    describe('when jenkins-access secret exists', () => {
      const url = 'url';
      const username = 'username';
      const password = 'password';
      const api_token = 'api_token';

      beforeEach(() => {
        mock_getSecretData.mockReturnValue({
          url,
          username,
          password,
          api_token
        });
      });

      test('return {url, username, password, api_token} from secret', async () => {
        const result = await getJenkinsInfo();

        expect(result).toEqual({url, username, password, api_token});
      });
    });

    describe('when no jenkins secrets exist', () => {
      const username = 'username';
      const password = 'password';

      beforeEach(() => {
        mock_getSecretData.mockRejectedValue(new Error('no secret found'));
      });

      test('return empty object', async () => {
        const result = await getJenkinsInfo();

        expect(result).toEqual({});
      });
    });
  });

  describe('given getSonarqubeInfo()', () => {
    let mock_getSonarqubeCredentials;
    let unset_getSonarqubeCredentials;

    let mock_getSonarqubeUrl;
    let unset_getSonarqubeUrl;

    beforeEach(() => {
      mock_getSonarqubeCredentials = jest.fn();
      unset_getSonarqubeCredentials = module.__set__('getSonarqubeCredentials', mock_getSonarqubeCredentials) as () => void;

      mock_getSonarqubeUrl = jest.fn();
      unset_getSonarqubeUrl = module.__set__('getSonarqubeUrl', mock_getSonarqubeUrl) as () => void;
    });

    afterEach(() => {
      unset_getSonarqubeCredentials();
      unset_getSonarqubeUrl();
    });

    describe('when called', () => {
      const credentials = {username: 'username'};
      const url = {url: 'url'};

      beforeEach(() => {
        mock_getSonarqubeCredentials.mockResolvedValue(credentials);
        mock_getSonarqubeUrl.mockResolvedValue(url);
      });

      test('return results from sonarqube credentials and url', async () => {
        expect(await getSonarqubeInfo()).toEqual(Object.assign(credentials, url));
      });
    });
  });

  describe('given getSonarqubeCredentials()', () => {
    let mock_getSecretData;
    let unset_getSecretData;

    beforeEach(() => {
      mock_getSecretData = jest.fn();
      unset_getSecretData = module.__set__('getSecretData', mock_getSecretData);
    });

    afterEach(() => {
      unset_getSecretData();
    });

    describe('when sonarqube-access secret exists', () => {
      const username = 'username';
      const password = 'password';

      beforeEach(() => {
        mock_getSecretData.mockResolvedValue({
          username,
          password,
        });
      });

      test('return {username, password} from secret', async () => {
        const result = await getSonarqubeCredentials();

        expect(result.username).toEqual(username);
        expect(result.password).toEqual(password);
      });
    });

    describe('when no sonarqube-access secret exists', () => {
      const username = 'username';
      const password = 'password';

      beforeEach(() => {
        mock_getSecretData.mockRejectedValue(new Error('no secret found'));
      });

      test('return empty object', async () => {
        const result = await getSonarqubeCredentials();

        expect(result).toEqual({});
      });
    });

  });

  describe('given getSonarqubeUrl()', () => {

    let mock_getIngressHosts;
    let unset_getIngressHosts;

    beforeEach(() => {
      mock_getIngressHosts = jest.fn();
      unset_getIngressHosts = module.__set__('getIngressHosts', mock_getIngressHosts);
    });

    afterEach(() => {
      unset_getIngressHosts();
    });

    describe('when successfully finds ingress host', () => {
      const host = 'host';

      beforeEach(() => {
        mock_getIngressHosts.mockResolvedValue([host]);
      });

      test('return url', async () => {
        expect(await getSonarqubeUrl()).toEqual({url: `http://${host}`});

        expect(mock_getIngressHosts.mock.calls[0]).toEqual(['tools', 'sonarqube-sonarqube']);
      });
    });

    describe('when fails to find ingress host', () => {

      beforeEach(() => {
        mock_getIngressHosts.mockRejectedValue(new Error('host not found'));
      });

      test('return {}', async () => {
        expect(await getSonarqubeUrl()).toEqual({});
      });
    });
  });

  describe('given getArgoCdInfo()', () => {
    let mock_getArgoCdCredentials;
    let unset_getArgoCdCredentials;

    let mock_getArgoCdUrl;
    let unset_getArgoCdUrl;

    beforeEach(() => {
      mock_getArgoCdCredentials = jest.fn();
      unset_getArgoCdCredentials = module.__set__('getArgoCdCredentials', mock_getArgoCdCredentials) as () => void;

      mock_getArgoCdUrl = jest.fn();
      unset_getArgoCdUrl = module.__set__('getArgoCdUrl', mock_getArgoCdUrl) as () => void;
    });

    afterEach(() => {
      unset_getArgoCdCredentials();
      unset_getArgoCdUrl();
    });

    describe('when called', () => {
      const credentials = {username: 'username'};
      const url = {url: 'url'};

      beforeEach(() => {
        mock_getArgoCdCredentials.mockResolvedValue(credentials);
        mock_getArgoCdUrl.mockResolvedValue(url);
      });

      test('return results from argo-cd credentials and url', async () => {
        expect(await getArgoCdInfo()).toEqual(Object.assign(credentials, url));
      });
    });
  });

  describe('given getArgoCdUrl()', () => {

    let mock_getIngressHosts;
    let unset_getIngressHosts;

    beforeEach(() => {
      mock_getIngressHosts = jest.fn();
      unset_getIngressHosts = module.__set__('getIngressHosts', mock_getIngressHosts);
    });

    afterEach(() => {
      unset_getIngressHosts();
    });

    describe('when successfully finds ingress host', () => {
      const host = 'host';
      const namespace = 'ns';

      beforeEach(() => {
        mock_getIngressHosts.mockResolvedValue([host]);
      });

      test('return url', async () => {
        expect(await getArgoCdUrl(namespace)).toEqual({url: `http://${host}`});

        expect(mock_getIngressHosts.mock.calls[0]).toEqual([namespace, 'argocd-server-http']);
      });
    });

    describe('when fails to find ingress host', () => {

      beforeEach(() => {
        mock_getIngressHosts.mockRejectedValue(new Error('host not found'));
      });

      test('return {}', async () => {
        expect(await getArgoCdUrl()).toEqual({});
      });
    });
  });
});
