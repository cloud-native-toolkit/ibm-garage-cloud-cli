import {Container} from 'typescript-ioc';

import {KubeClient} from './client';
import {KubeTektonTask} from "./tekton-task";
import {mockKubeClientFactory} from './testHelper';

describe('tekton-task', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given KubeTektonTask', () => {
    let classUnderTest: KubeTektonTask;

    beforeEach(() => {
      Container
        .bind(KubeClient)
        .factory(mockKubeClientFactory);

      classUnderTest = Container.get(KubeTektonTask);
    });
  });
});
