import {Container} from 'typescript-ioc';

import {mockKubeClientProvider} from './testHelper';
import {KubeClient} from './client';
import {KubeTektonTask} from "./tekton-task";

describe('tekton-task', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given KubeTektonTask', () => {
    let classUnderTest: KubeTektonTask;

    beforeEach(() => {
      Container
        .bind(KubeClient)
        .provider(mockKubeClientProvider);

      classUnderTest = Container.get(KubeTektonTask);
    });
  });
});
