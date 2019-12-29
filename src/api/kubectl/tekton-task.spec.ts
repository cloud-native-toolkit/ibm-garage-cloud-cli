import {Container} from 'typescript-ioc';

import {mockKubeClientProvider} from './testHelper';
import {KubeTektonTask} from "./tekton-task";
import {KubeKindBuilder} from './kind-builder';

describe('tekton-task', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given KubeTektonTask', () => {
    let classUnderTest: KubeTektonTask;

    beforeEach(() => {
      Container
        .bind(KubeKindBuilder)
        .provider(mockKubeClientProvider);

      classUnderTest = Container.get(KubeTektonTask);
    });
  });
});
