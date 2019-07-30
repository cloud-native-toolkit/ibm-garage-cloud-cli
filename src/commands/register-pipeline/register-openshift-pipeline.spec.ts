import rewire = require('rewire');
import {GitParams} from './create-git-secret';
import mock = jest.mock;

const module = rewire('./register-openshift-pipeline');

const registerPipeline = module.__get__('registerPipeline');
const createBuildPipeline = module.__get__('createBuildPipeline');
const shouldUpdateExistingBuildConfig = module.__get__('shouldUpdateExistingBuildConfig');
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

    test('should apply the buildConfig to OpenShift', async () => {
      const pipelineName = 'pipeline-name';
      const buildConfig = {metadata: {name: pipelineName}};
      const fileName = 'filename.json';
      const jenkinsHost = 'test';
      const jenkinsNamespace = 'namespace';
      const pipelineNamespace = 'namespace1';

      mock_generateBuildConfig.mockReturnValue(buildConfig);
      mock_writeFile.mockResolvedValue(fileName);
      mock_createBuildPipeline.mockResolvedValue({});
      mock_getRouteHosts.mockResolvedValue([jenkinsHost]);

      const result = await registerPipeline({jenkinsNamespace, pipelineNamespace}, gitParams);

      expect(result.jenkinsUrl).toEqual(`https://${jenkinsHost}`);

      expect(mock_writeFile).toHaveBeenCalledWith(`${process.cwd()}/pipeline-build-config.json`, JSON.stringify(buildConfig));

      expect(mock_createBuildPipeline).toHaveBeenCalledWith(pipelineName, fileName, pipelineNamespace);
    });
  });

  describe('createBuildPipeline()', () => {
    const fileName = 'filename';
    const namespace = 'test';
    const pipelineName = 'my pipeline';

    let mock_create;
    let unset_create;

    let mock_startBuild;
    let unset_startBuild;

    let mock_shouldUpdateExistingBuildConfig;
    let unset_shouldUpdateExistingBuildConfig;

    let mock_apply;
    let unset_apply;

    beforeEach(() => {
      mock_create = jest.fn();
      unset_create = module.__set__('create', mock_create) as () => void;

      mock_startBuild = jest.fn();
      unset_startBuild = module.__set__('startBuild', mock_startBuild) as () => void;

      mock_shouldUpdateExistingBuildConfig = jest.fn();
      unset_shouldUpdateExistingBuildConfig = module.__set__('shouldUpdateExistingBuildConfig', mock_shouldUpdateExistingBuildConfig) as () => void;

      mock_apply = jest.fn();
      unset_apply = module.__set__('apply', mock_apply) as () => void;
    });

    afterEach(() => {
      unset_create();
      unset_startBuild();
      unset_shouldUpdateExistingBuildConfig();
      unset_apply();
    });

    describe('when kubectl create is successful', () => {
      beforeEach(() => {
        mock_create.mockResolvedValue({});
      });

      test('should start the pipeline build', async () => {

        await createBuildPipeline(pipelineName, fileName, namespace);

        expect(mock_create).toHaveBeenCalledWith(fileName, namespace);
        expect(mock_startBuild).toHaveBeenCalledWith(pipelineName, namespace);
      });
    });

    describe('when kubectl create fails because pipeline already exists', () => {
      beforeEach(() => {
        mock_create.mockRejectedValue(new Error('already exists'));
      });

      test('should check if existing pipeline should be updated', async () => {

        await createBuildPipeline(pipelineName, fileName, namespace);

        expect(mock_shouldUpdateExistingBuildConfig).toHaveBeenCalled();
      });

      describe('and when existing should be updated', () => {
        beforeEach(() => {
          mock_shouldUpdateExistingBuildConfig.mockResolvedValue(true);
        });

        test('should call kubectl apply', async () => {

          await createBuildPipeline(pipelineName, fileName, namespace);

          expect(mock_apply).toHaveBeenCalledWith(fileName, namespace);
        });
      });

      describe('and when existing should not be updated', () => {
        beforeEach(() => {
          mock_shouldUpdateExistingBuildConfig.mockResolvedValue(false);
        });

        test('should not call kubectl apply', async () => {

          await createBuildPipeline(pipelineName, fileName, namespace);

          expect(mock_apply).not.toHaveBeenCalled();
        });
      });
    });

    describe('when kubectl create fails for a reason other than existing pipeline', () => {
      const errorMessage = 'some other error';

      beforeEach(() => {
        mock_create.mockRejectedValue(new Error(errorMessage));
      });

      test('should throw error', () => {
        return createBuildPipeline(pipelineName, fileName, namespace)
          .then(result => fail('should throw error'))
          .catch(err => {
            expect(err.message).toEqual(errorMessage);
          });
      });
    });
  });

  describe('shouldUpdateExistingBuildConfif()', () => {

    let mock_prompt;
    let unset_prompt;

    beforeEach(() => {
      mock_prompt = jest.fn();
      unset_prompt = module.__set__('prompt', mock_prompt) as () => void;
    });

    afterEach(() => {
      unset_prompt();
    });

    test('should prompt user with pipeline name', async () => {
      const pipelineName = 'some-pipeline';
      const expectedResult = true;

      mock_prompt.mockResolvedValue({shouldUpdate: expectedResult});

      const actualResult = await shouldUpdateExistingBuildConfig(pipelineName);

      expect(actualResult).toEqual(expectedResult);

      expect(mock_prompt).toHaveBeenCalled();
      const questions = mock_prompt.mock.calls[0][0];

      const shouldUpdate = questions.find(question => question.name === 'shouldUpdate');
      expect(shouldUpdate).not.toBeUndefined();
      expect(shouldUpdate.message).toContain(pipelineName);
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
