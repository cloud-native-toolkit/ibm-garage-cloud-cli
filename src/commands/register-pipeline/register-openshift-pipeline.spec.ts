import rewire = require('rewire');
import {GitParams} from './create-git-secret';

const module = rewire('./register-openshift-pipeline');

const registerPipeline = module.__get__('registerPipeline');
const parseRouteOutput = module.__get__('parseRouteOutput');

describe('register-openshift-pipeline', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('registerPipeline()', () => {
    const name = 'name';
    const url = 'url';
    const username = 'username';
    const password = 'password';
    const branch = 'branch';
    const gitParams: GitParams = {name, url, username, password, branch};

    let mock_generateBuildConfig;
    let unset_generateBuildConfig;

    let mock_writeFile;
    let unset_writeFile;

    let mock_spawnPromise;
    let unset_spawnPromise;

    let mock_getRouteHosts;
    let unset_getRouteHosts;

    var mock_deleteFile;
    var unset_deleteFile;

    beforeEach(() => {

      mock_generateBuildConfig = jest.fn();
      unset_generateBuildConfig = module.__set__('generateBuildConfig', mock_generateBuildConfig) as () => void;

      mock_writeFile = jest.fn();
      unset_writeFile = module.__set__('writeFile', mock_writeFile) as () => void;

      mock_spawnPromise = jest.fn();
      unset_spawnPromise = module.__set__('spawnPromise', mock_spawnPromise) as () => void;

      mock_deleteFile = jest.fn();
      unset_deleteFile = module.__set__('deleteFile', mock_deleteFile) as () => void;

      mock_getRouteHosts = jest.fn();
      unset_getRouteHosts = module.__set__('getRouteHosts', mock_getRouteHosts) as () => void;
    });

    afterEach(() => {
      unset_generateBuildConfig();
      unset_writeFile();
      unset_spawnPromise();
      unset_deleteFile();
      unset_getRouteHosts();
    });

    test('should write the buildConfig to a temp file', async () => {
      const expectedResult = {test: 'value'};
      mock_generateBuildConfig.mockReturnValue(expectedResult);

      await registerPipeline({}, gitParams);

      expect(mock_writeFile.mock.calls.length).toEqual(1);
      expect(mock_writeFile.mock.calls[0][1]).toEqual(JSON.stringify(expectedResult));
    });

    test('should spawn a process to run `oc create -f {file}`', async () => {
      const expectedResult = {test: 'value'};
      mock_generateBuildConfig.mockReturnValue(expectedResult);

      mock_writeFile.mockResolvedValue({});
      mock_spawnPromise.mockResolvedValue({});
      mock_deleteFile.mockResolvedValue({});

      const jenkinsUrl = 'test';
      mock_getRouteHosts.mockResolvedValue([jenkinsUrl]);

      const namespace = 'namespace';
      const result = await registerPipeline({namespace}, gitParams);

      expect(result.jenkinsUrl).toEqual(`https://${jenkinsUrl}`);

      expect(mock_writeFile.mock.calls.length).toEqual(1);
      expect(mock_writeFile.mock.calls[0][1]).toEqual(JSON.stringify(expectedResult));

      expect(mock_spawnPromise.mock.calls.length).toEqual(2);
      expect(mock_spawnPromise.mock.calls[0][0]).toEqual('oc');
      expect(mock_spawnPromise.mock.calls[0][1]).toEqual(['project', namespace]);

      expect(mock_spawnPromise.mock.calls[1][0]).toEqual('oc');
      expect(mock_spawnPromise.mock.calls[1][1][0]).toEqual('create');

      expect(mock_deleteFile.mock.calls.length).toEqual(1);
    });
  });

  describe('parseRouteOutput()', () => {
    describe('when routeText has json data', () => {
      test('return json values', () => {
        const expectedResult = {test: {more: 'value'}};

        expect(parseRouteOutput(JSON.stringify(expectedResult))).toEqual(expectedResult);
      });
    });
    describe('when routeText has non-json data before json values', () => {
      const expectedResult = {test: {more: 'value'}};

      expect(parseRouteOutput('test' + JSON.stringify(expectedResult))).toEqual(expectedResult);

    });
  });
});
