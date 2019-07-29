import rewire = require('rewire');
import {GitParams} from './create-git-secret';

const module = rewire('./register-openshift-pipeline');

const registerPipeline = module.__get__('registerPipeline');
const createBuildPipeline = module.__get__('createBuildPipeline');
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

    let mock_createBuildPipeline;
    let unset_createBuildPipeline;

    beforeEach(() => {

      mock_generateBuildConfig = jest.fn();
      unset_generateBuildConfig = module.__set__('generateBuildConfig', mock_generateBuildConfig) as () => void;

      mock_writeFile = jest.fn();
      unset_writeFile = module.__set__('writeFile', mock_writeFile) as () => void;

      mock_createBuildPipeline = jest.fn();
      unset_createBuildPipeline = module.__set__('createBuildPipeline', mock_createBuildPipeline) as () => void;

      mock_getRouteHosts = jest.fn();
      unset_getRouteHosts = module.__set__('getRouteHosts', mock_getRouteHosts) as () => void;
    });

    afterEach(() => {
      unset_generateBuildConfig();
      unset_writeFile();
      unset_createBuildPipeline();
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
      const pipelineName = 'pipeline-name';
      const buildConfig = {metadata: {name: pipelineName}};
      const fileName = 'filename.json';
      const jenkinsHost = 'test';
      const namespace = 'namespace';

      mock_generateBuildConfig.mockReturnValue(buildConfig);
      mock_writeFile.mockResolvedValue(fileName);
      mock_createBuildPipeline.mockResolvedValue({});
      mock_getRouteHosts.mockResolvedValue([jenkinsHost]);

      const result = await registerPipeline({namespace}, gitParams);

      expect(result.jenkinsUrl).toEqual(`https://${jenkinsHost}`);

      expect(mock_writeFile.mock.calls.length).toEqual(1);
      expect(mock_writeFile.mock.calls[0][0]).toMatch(new RegExp(`^${process.cwd()}/pipeline-build-config.json`));
      expect(mock_writeFile.mock.calls[0][1]).toEqual(JSON.stringify(buildConfig));

      expect(mock_createBuildPipeline.mock.calls.length).toEqual(1);
      expect(mock_createBuildPipeline.mock.calls[0][0]).toEqual(pipelineName);
      expect(mock_createBuildPipeline.mock.calls[0][1]).toEqual(fileName);
      expect(mock_createBuildPipeline.mock.calls[0][2]).toEqual(namespace);
    });
  });

  describe('createBuildConfig()', () => {

    let mock_kubectlCreate;
    let unset_kubectlCreate;

    let mock_startBuild;
    let unset_startBuild;

    beforeEach(() => {
      mock_kubectlCreate = jest.fn();
      unset_kubectlCreate = module.__set__('kubectlCreate', mock_kubectlCreate) as () => void;

      mock_startBuild = jest.fn();
      unset_startBuild = module.__set__('startBuild', mock_startBuild) as () => void;
    });

    describe('when kubectlCreate is successful', () => {
      beforeEach(() => {
        mock_kubectlCreate.mockResolvedValue({});
      });

      test('should start the pipeline build', async () => {
        const fileName = 'filename';
        const namespace = 'test';
        const pipelineName = 'my pipeline';

        await createBuildPipeline(pipelineName, fileName, namespace);

        expect(mock_kubectlCreate.mock.calls.length).toEqual(1);
        expect(mock_kubectlCreate.mock.calls[0]).toEqual([fileName, namespace]);

        expect(mock_startBuild.mock.calls.length).toEqual(1);
        expect(mock_startBuild.mock.calls[0][0]).toEqual(pipelineName);
      });
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
