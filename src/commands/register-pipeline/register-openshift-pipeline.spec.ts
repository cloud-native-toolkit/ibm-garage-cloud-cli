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

    let mock_getRouteHosts;
    let unset_getRouteHosts;

    let mock_createBuildConfig;
    let unset_createBuildConfig;

    beforeEach(() => {

      mock_generateBuildConfig = jest.fn();
      unset_generateBuildConfig = module.__set__('generateBuildConfig', mock_generateBuildConfig) as () => void;

      mock_writeFile = jest.fn();
      unset_writeFile = module.__set__('writeFile', mock_writeFile) as () => void;

      mock_createBuildConfig = jest.fn();
      unset_createBuildConfig = module.__set__('createBuildConfig', mock_createBuildConfig) as () => void;

      mock_getRouteHosts = jest.fn();
      unset_getRouteHosts = module.__set__('getRouteHosts', mock_getRouteHosts) as () => void;
    });

    afterEach(() => {
      unset_generateBuildConfig();
      unset_writeFile();
      unset_createBuildConfig();
      unset_getRouteHosts();
    });

    test('should generate the buildConfig', async () => {
      const expectedResult = {test: 'value'};
      mock_generateBuildConfig.mockReturnValue(expectedResult);

      await registerPipeline({}, gitParams);

      expect(mock_writeFile.mock.calls.length).toEqual(1);
      expect(mock_writeFile.mock.calls[0][1]).toEqual(JSON.stringify(expectedResult));
    });

    test('should apply the buildConfig to OpenShift', async () => {
      const buildConfig = {metadata: {name: 'pipeline-name'}};
      const fileName = 'filename.json';
      const jenkinsHost = 'test';
      const namespace = 'namespace';

      mock_generateBuildConfig.mockReturnValue(buildConfig);
      mock_writeFile.mockResolvedValue(fileName);
      mock_createBuildConfig.mockResolvedValue({});
      mock_getRouteHosts.mockResolvedValue([jenkinsHost]);

      const result = await registerPipeline({namespace}, gitParams);

      expect(result.jenkinsUrl).toEqual(`https://${jenkinsHost}`);

      expect(mock_writeFile.mock.calls.length).toEqual(1);
      expect(mock_writeFile.mock.calls[0][0]).toMatch(new RegExp(`^${process.cwd()}/pipeline-build-config.json`));
      expect(mock_writeFile.mock.calls[0][1]).toEqual(JSON.stringify(buildConfig));

      expect(mock_createBuildConfig.mock.calls.length).toEqual(1);
      expect(mock_createBuildConfig.mock.calls[0][0]).toEqual(fileName);
      expect(mock_createBuildConfig.mock.calls[0][1]).toEqual(namespace);
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
