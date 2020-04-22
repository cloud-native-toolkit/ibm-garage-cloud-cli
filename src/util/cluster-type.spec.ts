import {Container} from 'typescript-ioc';

import {ClusterType, isClusterConfigNotFound} from './cluster-type';
import {KubeConfigMap, KubeSecret} from '../api/kubectl';
import {providerFromValue} from '../testHelper';
import Mock = jest.Mock;

describe('cluster-type', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  let classUnderTest: ClusterType;

  let getData: Mock;

  beforeEach(() => {
    getData = jest.fn();

    const kubeConfigMap = {
      getData,
    };
    Container.bind(KubeConfigMap).provider(providerFromValue(kubeConfigMap));

    classUnderTest = Container.get(ClusterType);
  });

  describe('given getClusterType()', () => {
    const clusterType = 'cluster type';
    const serverUrl = 'server url';

    describe('when cluster-config config map exists', () => {
      beforeEach(() => {
        getData.mockResolvedValue({CLUSTER_TYPE: clusterType, SERVER_URL: serverUrl});
      });

      test('then return clusterType and serverUrl', async () => {
        const namespace = 'namespace';
        expect(await classUnderTest.getClusterType(namespace))
          .toEqual({clusterType, serverUrl});

        expect(getData).toHaveBeenCalledWith('cluster-config', namespace);
      });
    });

    describe('when cluster-config config map does not exist', () => {
      beforeEach(() => {
        getData.mockRejectedValueOnce(new Error('not found'));
        getData.mockResolvedValue({CLUSTER_TYPE: clusterType, SERVER_URL: serverUrl});
      });

      test('then get clusterType and serverUrl from ibmcloud-config config map', async () => {
        const namespace = 'namespace';
        expect(await classUnderTest.getClusterType(namespace))
          .toEqual({clusterType, serverUrl});

        expect(getData).toHaveBeenCalledTimes(2);
        expect(getData.mock.calls[0]).toEqual(['cluster-config', namespace]);
        expect(getData.mock.calls[1]).toEqual(['ibmcloud-config', namespace]);
      });

      describe('and when ibmcloud-config does not exist', () => {
        beforeEach(() => {
          getData.mockRejectedValue(new Error('not found'));
        });

        test('then throw ClusterConfigNotFound', async () => {
          return classUnderTest.getClusterType('my-namespace')
            .then(value => fail('should throw error'))
            .catch(err => {
              expect(isClusterConfigNotFound(err)).toEqual(true);
            });
        });
      });
    });
  });
});