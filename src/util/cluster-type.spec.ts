import {Container} from 'typescript-ioc';

import {ClusterType} from './cluster-type';
import {OcpProject} from '../api/kubectl';
import {ServerUrl} from './server-url';
import Mock = jest.Mock;

describe('cluster-type', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  let classUnderTest: ClusterType;

  let projectExists: Mock;
  let getServerUrl: Mock;

  beforeEach(() => {
    projectExists = jest.fn();
    const project = {
      exists: projectExists
    };
    Container.bind(OcpProject).factory(() => project);

    getServerUrl = jest.fn();
    const serverUrl = {
      getServerUrl
    };
    Container.bind(ServerUrl).factory(() => serverUrl);

    classUnderTest = Container.get(ClusterType);
  });

  describe('given getClusterType()', () => {
    const serverUrl = 'server url';

    beforeEach(() => {
      getServerUrl.mockResolvedValue(serverUrl);
    });

    describe('when openshift project exists', () => {
      beforeEach(() => {
        projectExists.mockResolvedValue(true);
      });

      test('then clusterType should be openshift', async () => {
        const clusterType = 'openshift';
        expect(await classUnderTest.getClusterType('namespace'))
          .toEqual({clusterType, serverUrl});

        expect(projectExists).toHaveBeenCalledWith('openshift');
      });
    });

    describe('when openshift project does not exist', () => {
      beforeEach(() => {
        projectExists.mockResolvedValue(false);
      });

      test('then clusterType should be kubernetes', async () => {
        const clusterType = 'kubernetes';
        expect(await classUnderTest.getClusterType('namespace'))
          .toEqual({clusterType, serverUrl});

        expect(projectExists).toHaveBeenCalledWith('openshift');
      });
    });

    describe('when project.exists throws an error', () => {
      beforeEach(() => {
        projectExists.mockRejectedValue(new Error('no resource named project'));
      });

      test('then clusterType should be kubernetes', async () => {
        const clusterType = 'kubernetes';
        expect(await classUnderTest.getClusterType('namespace'))
          .toEqual({clusterType, serverUrl});

        expect(projectExists).toHaveBeenCalledWith('openshift');
      });
    });
  });
});