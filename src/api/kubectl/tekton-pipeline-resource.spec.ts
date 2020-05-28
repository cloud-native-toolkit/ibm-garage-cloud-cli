import {Container} from 'typescript-ioc';

import {mockKubeClientFactory} from './testHelper';
import {KubeClient} from './client';
import {KubeTektonPipelineResource} from './tekton-pipeline-resource';

describe('tekton-pipeline-resource', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given KubeTektonPipelineResource', () => {
    let classUnderTest: KubeTektonPipelineResource;

    beforeEach(() => {
      Container
        .bind(KubeClient)
        .factory(mockKubeClientFactory);

      classUnderTest = Container.get(KubeTektonPipelineResource);
    });
  });
});
