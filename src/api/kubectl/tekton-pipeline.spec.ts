import {Container} from 'typescript-ioc';

import {mockKubeClientProvider} from './testHelper';
import {KubeTektonTask} from "./tekton-task";
import {KubeTektonPipeline} from "./tekton-pipeline";
import {KubeKindBuilder} from './kind-builder';

describe('tekton-pipeline', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given KubeTektonPipeline', () => {
    let classUnderTest: KubeTektonPipeline;

    beforeEach(() => {
      Container
        .bind(KubeKindBuilder)
        .provider(mockKubeClientProvider);

      classUnderTest = Container.get(KubeTektonPipeline);
    });
  });
});
