import {Container} from 'typescript-ioc';
import Mock = jest.Mock;
import * as YAML from 'js-yaml';

jest.mock('inquirer');

import {RegisterOpenshiftPipeline} from './register-openshift-pipeline';
import {factoryFromValue, setField} from '../../../testHelper';
import {FsPromises} from '../../../util/file-util';
import {OpenshiftCommands} from '../../../api/openshift';
import {GitParams} from '../../git-secret';

describe('register-openshift-pipeline', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given RegisterOpenshiftPipeline', () => {
    let classUnderTest: RegisterOpenshiftPipeline;

    let mock_writeFile: Mock;
    let mock_create: Mock;
    let mock_startBuild: Mock;
    let mock_apply: Mock;

    beforeEach(() => {
      mock_create = jest.fn();
      mock_startBuild = jest.fn();
      mock_apply = jest.fn();
      Container.bind(OpenshiftCommands).factory(factoryFromValue({create: mock_create, startBuild: mock_startBuild, apply: mock_apply}));

      mock_writeFile = jest.fn();
      Container.bind(FsPromises).factory(factoryFromValue({writeFile: mock_writeFile}));

      classUnderTest = Container.get(RegisterOpenshiftPipeline);
    });

    describe('registerPipeline()', () => {
      const name = 'name';
      const org = 'org';
      const repo = 'repo';
      const url = 'url';
      const username = 'username';
      const password = 'password';
      const branch = 'branch';
      const gitParams: GitParams = {name, url, username, password, branch, owner: org, repo};

      let mock_generateBuildConfig;
      let unset_generateBuildConfig;

      let mock_getRouteHosts;
      let unset_getRouteHosts;

      let mock_createBuildPipeline;
      let unset_createBuildPipeline;

      beforeEach(() => {

        mock_generateBuildConfig = jest.fn();
        unset_generateBuildConfig = setField(classUnderTest, 'generateBuildConfig', mock_generateBuildConfig) as () => void;

        mock_createBuildPipeline = jest.fn();
        unset_createBuildPipeline = setField(classUnderTest, 'createBuildPipeline', mock_createBuildPipeline) as () => void;

        mock_getRouteHosts = jest.fn();
        unset_getRouteHosts = setField(classUnderTest, 'getRouteHost', mock_getRouteHosts) as () => void;
      });

      afterEach(() => {
        unset_generateBuildConfig();
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

        const result = await classUnderTest.registerPipeline({templateNamespace: jenkinsNamespace, pipelineNamespace}, gitParams, 'name', 'credentialName');

        expect(result.jenkinsUrl).toEqual(`https://${jenkinsHost}`);

        expect(mock_writeFile).toHaveBeenCalledWith(`${process.cwd()}/pipeline-build-config.yaml`, YAML.safeDump(buildConfig));

        expect(mock_createBuildPipeline).toHaveBeenCalledWith(pipelineName, fileName, pipelineNamespace);
      });
    });

    describe('createBuildPipeline()', () => {
      const fileName = 'filename';
      const namespace = 'test';
      const pipelineName = 'my pipeline';

      let mock_shouldUpdateExistingBuildConfig;
      let unset_shouldUpdateExistingBuildConfig;

      beforeEach(() => {

        mock_shouldUpdateExistingBuildConfig = jest.fn();
        unset_shouldUpdateExistingBuildConfig = setField(classUnderTest, 'shouldUpdateExistingBuildConfig', mock_shouldUpdateExistingBuildConfig) as () => void;
      });

      afterEach(() => {
        unset_shouldUpdateExistingBuildConfig();
      });

      describe('when kubectl create is successful', () => {
        beforeEach(() => {
          mock_create.mockResolvedValue({});
        });

        test('should start the pipeline build', async () => {

          await classUnderTest.createBuildPipeline(pipelineName, fileName, namespace);

          expect(mock_create).toHaveBeenCalledWith(fileName, namespace);
          expect(mock_startBuild).toHaveBeenCalledWith(pipelineName, namespace);
        });
      });

      describe('when kubectl create fails because pipeline already exists', () => {
        beforeEach(() => {
          mock_create.mockRejectedValue(new Error('already exists'));
        });

        test('should check if existing pipeline should be updated', async () => {

          await classUnderTest.createBuildPipeline(pipelineName, fileName, namespace);

          expect(mock_shouldUpdateExistingBuildConfig).toHaveBeenCalled();
        });

        describe('and when existing should be updated', () => {
          beforeEach(() => {
            mock_shouldUpdateExistingBuildConfig.mockResolvedValue(true);
          });

          test('should call kubectl apply', async () => {

            await classUnderTest.createBuildPipeline(pipelineName, fileName, namespace);

            expect(mock_apply).toHaveBeenCalledWith(fileName, namespace);
          });
        });

        describe('and when existing should not be updated', () => {
          beforeEach(() => {
            mock_shouldUpdateExistingBuildConfig.mockResolvedValue(false);
          });

          test('should not call kubectl apply', async () => {

            await classUnderTest.createBuildPipeline(pipelineName, fileName, namespace);

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
          return classUnderTest.createBuildPipeline(pipelineName, fileName, namespace)
            .then(result => fail('should throw error'))
            .catch(err => {
              expect(err.message).toEqual(errorMessage);
            });
        });
      });
    });

    describe('shouldUpdateExistingBuildConfig()', () => {

      let mock_prompt: Mock;

      beforeEach(() => {
        mock_prompt = require('inquirer').prompt;
      });

      test('should prompt user with pipeline name', async () => {
        const pipelineName = 'some-pipeline';
        const expectedResult = true;

        mock_prompt.mockResolvedValue({shouldUpdate: expectedResult});

        const actualResult = await classUnderTest.shouldUpdateExistingBuildConfig(pipelineName);

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

          expect(classUnderTest.parseRouteOutput(JSON.stringify(expectedResult))).toEqual(expectedResult);
        });
      });
      describe('when routeText has non-json data before json values', () => {
        test('return json values', () => {
          const expectedResult = {test: {more: 'value'}};

          expect(classUnderTest.parseRouteOutput('test' + JSON.stringify(expectedResult))).toEqual(expectedResult);
        });
      });
    });
  });
});
