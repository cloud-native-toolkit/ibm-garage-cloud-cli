import {Container} from 'typescript-ioc';

import {mockKubeClientProvider} from './testHelper';
import {KubeTektonPipelineResource} from './tekton-pipeline-resource';
import {KubeKindBuilder} from './kind-builder';

describe('tekton-pipeline-resource', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given KubeTektonPipelineResource', () => {
    let classUnderTest: KubeTektonPipelineResource;

    beforeEach(() => {
      Container
        .bind(KubeKindBuilder)
        .provider(mockKubeClientProvider);

      classUnderTest = Container.get(KubeTektonPipelineResource);
    });
  });
});
