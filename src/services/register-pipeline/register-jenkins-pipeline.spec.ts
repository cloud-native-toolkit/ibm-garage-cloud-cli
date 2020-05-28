import {Container} from 'typescript-ioc';

import {RegisterPipelineOptions} from './register-pipeline.api';
import {RegisterJenkinsPipelineImpl} from './register-jenkins-pipeline';
import {RegisterPipelineType} from './jenkins';
import {GitParams} from '../git-secret';
import {KubeConfigMap, KubeSecret} from '../../api/kubectl';
import {factoryFromValue, setField} from '../../testHelper';
import Mock = jest.Mock;

describe('register-pipeline', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given RegisterPipeline', () => {
    let classUnderTest: RegisterJenkinsPipelineImpl;

    let mock_getConfigMapData: Mock;
    let mock_getSecretData: Mock;

    beforeEach(() => {

      mock_getConfigMapData = jest.fn();
      Container.bind(KubeConfigMap).factory(factoryFromValue({getData: mock_getConfigMapData}));

      mock_getSecretData = jest.fn();
      Container.bind(KubeSecret).factory(factoryFromValue({getData: mock_getSecretData}));

      classUnderTest = Container.get(RegisterJenkinsPipelineImpl);
    });

    describe('executeRegisterPipeline()', () => {
      let mock_getPipelineType: Mock;
      let unset_getPipelineType: () => void;

      let mock_registerPipeline: Mock  = jest.fn();

      beforeEach(() => {
        mock_getPipelineType = jest.fn();
        unset_getPipelineType = setField(classUnderTest, 'getPipelineType', mock_getPipelineType);

        const pipeline: RegisterPipelineType = {
          registerPipeline: mock_registerPipeline,
        } as any;

        mock_getPipelineType.mockReturnValue(pipeline);
      });

      afterEach(() => {
        unset_getPipelineType();
      });

      describe('when called', () => {
        test('then get the pipeline and call registerPipeline()', async () => {
          const expectedResult = {};
          mock_registerPipeline.mockResolvedValue(expectedResult);

          const clusterType = 'clusterType' as any;
          const options: RegisterPipelineOptions = {} as any;
          const gitParams: GitParams = {} as any;
          const credentialsName = 'credentialsName';
          const pipelineName = 'pipeline name';
          expect(await classUnderTest.executeRegisterPipeline(clusterType, options, gitParams, pipelineName, credentialsName)).toBe(expectedResult);

          expect(mock_getPipelineType).toHaveBeenCalledWith(clusterType);
          expect(mock_registerPipeline).toHaveBeenCalledWith(options, gitParams, pipelineName, credentialsName);
        });
      });
    });

    describe('buildCreateWebhookOptions()', () => {
      test('map GitParams to CreateWebhookOptions', () => {
        const gitParams = {
          url: 'url',
          username: 'username',
          password: 'password'
        } as any;

        const pipelineResult = {
          jenkinsUrl: 'jenkinsUrl'
        } as any;

        const result = classUnderTest.buildCreateWebhookOptions(gitParams, pipelineResult);

        expect(result.gitUrl).toEqual(gitParams.url);
        expect(result.gitUsername).toEqual(gitParams.username);
        expect(result.gitToken).toEqual(gitParams.password);
        expect(result.jenkinsUrl).toEqual(pipelineResult.jenkinsUrl);
      });
    });
  });
});
