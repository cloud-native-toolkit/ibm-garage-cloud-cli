import {Container} from 'typescript-ioc';

import {KubeConfigMap, KubeSecret} from '../../api/kubectl';
import {setField, providerFromValue} from '../../testHelper';
import {RegisterPipeline, RegisterJenkinsPipeline} from './register-jenkins-pipeline';
import {FsPromises} from '../../util/file-util';
import {RegisterPipelineType} from './register-pipeline-type';
import {RegisterPipelineOptions} from './register-pipeline-options.model';
import Mock = jest.Mock;
import {GitParams} from '../git-secret';

describe('register-pipeline', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given RegisterPipeline', () => {
    let classUnderTest: RegisterJenkinsPipeline;

    let mock_getConfigMapData: Mock;
    let mock_getSecretData: Mock;

    beforeEach(() => {

      mock_getConfigMapData = jest.fn();
      Container.bind(KubeConfigMap).provider(providerFromValue({getData: mock_getConfigMapData}));

      mock_getSecretData = jest.fn();
      Container.bind(KubeSecret).provider(providerFromValue({getData: mock_getSecretData}));

      classUnderTest = Container.get(RegisterPipeline);
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
          expect(await classUnderTest.executeRegisterPipeline(clusterType, options, gitParams, credentialsName)).toBe(expectedResult);

          expect(mock_getPipelineType).toHaveBeenCalledWith(clusterType);
          expect(mock_registerPipeline).toHaveBeenCalledWith(options, gitParams, credentialsName);
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
