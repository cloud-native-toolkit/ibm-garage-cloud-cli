import {Container} from 'typescript-ioc';

import {mockKubeClientFactory} from './testHelper';
import {KubeClient} from './client';
import {KubeTektonPipeline} from './tekton-pipeline';

describe('tekton-pipeline', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given KubeTektonPipeline', () => {
    let classUnderTest: KubeTektonPipeline;

    beforeEach(() => {
      Container
        .bind(KubeClient)
        .factory(mockKubeClientFactory);

      classUnderTest = Container.get(KubeTektonPipeline);
    });
  });
});
