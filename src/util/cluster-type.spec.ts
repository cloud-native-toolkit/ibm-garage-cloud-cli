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

  let projectList: Mock;
  let getServerUrl: Mock;

  beforeEach(() => {
    projectList = jest.fn();
    const project = {
      list: projectList
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

    describe('when openshift list returns a value', () => {
      beforeEach(() => {
        projectList.mockResolvedValue([]);
      });

      test('then clusterType should be openshift', async () => {
        const clusterType = 'openshift';
        expect(await classUnderTest.getClusterType('namespace'))
          .toEqual({clusterType, serverUrl});

        expect(projectList).toHaveBeenCalled();
      });
    });

    describe('when project list throws an error', () => {
      beforeEach(() => {
        projectList.mockRejectedValue(new Error('no resource named project'));
      });

      test('then clusterType should be kubernetes', async () => {
        const clusterType = 'kubernetes';
        expect(await classUnderTest.getClusterType('namespace'))
          .toEqual({clusterType, serverUrl});

        expect(projectList).toHaveBeenCalled();
      });
    });
  });
});
