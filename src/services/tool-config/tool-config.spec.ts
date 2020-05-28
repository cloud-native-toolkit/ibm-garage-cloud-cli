import {Container} from 'typescript-ioc';
import {ToolsConfig} from './tool-config';
import {KubeConfigMap, KubeSecret, Secret} from '../../api/kubectl';
import {factoryFromValue, setField} from '../../testHelper';
import Mock = jest.Mock;

describe('tool-config', () => {
  test('canary verifies test infrastructure', () => {
     expect(true).toEqual(true);
  });

  let classUnderTest: ToolsConfig;
  let kubeConfigMap_createOrUpdate: Mock;
  let kubeSecret_createOrUpdate: Mock;

  beforeEach(() => {
    kubeConfigMap_createOrUpdate = jest.fn();
    kubeSecret_createOrUpdate = jest.fn();
    Container.bind(KubeConfigMap).factory(factoryFromValue({
      createOrUpdate: kubeConfigMap_createOrUpdate,
    }));
    Container.bind(KubeSecret).factory(factoryFromValue({
      createOrUpdate: kubeSecret_createOrUpdate,
    }));

    classUnderTest = Container.get(ToolsConfig);
  });

  describe('given configureTool()', () => {
    let mock_buildConfigMap: Mock;
    let unset_buildConfigMap: () => void;

    let mock_buildSecret: Mock;
    let unset_buildSecret: () => void;

    beforeEach(() => {
      mock_buildConfigMap = jest.fn();
      unset_buildConfigMap = setField(classUnderTest, 'buildConfigMap', mock_buildConfigMap);

      mock_buildSecret = jest.fn();
      unset_buildSecret = setField(classUnderTest, 'buildSecret', mock_buildSecret);
    });
    afterEach(() => {
      unset_buildConfigMap();
      unset_buildSecret();
    });

    describe('when url is defined', () => {
      test('then create ConfigMap', async () => {
        const name = 'test';
        const url = 'url';
        const namespace = 'namespace';

        const configMap = {};
        mock_buildConfigMap.mockReturnValue(configMap);

        kubeConfigMap_createOrUpdate.mockResolvedValue({metadata: {name}});

        await classUnderTest.configureTool({name, url, namespace});

        const configMapName = `${name}-config`;
        expect(kubeConfigMap_createOrUpdate).toHaveBeenCalledWith(
          configMapName,
          {body: configMap},
          namespace
        );
      });
    });

    describe('when username and password are defined', () => {
      test('then create secret', async () => {
        const name = 'test';
        const username = 'username';
        const password = 'password';
        const namespace = 'namespace';

        const secret = {};
        mock_buildSecret.mockReturnValue(secret);

        kubeSecret_createOrUpdate.mockResolvedValue({metadata: {name}});

        await classUnderTest.configureTool({name, username, password, namespace});

        const secretName = `${name}-access`;
        expect(kubeSecret_createOrUpdate).toHaveBeenCalledWith(
          secretName,
          {body: secret},
          namespace,
        );
      });
    });
  });

  describe('given buildConfigMap()', () => {
    describe('when called', () => {
      test('then return configMap', async () => {
        const name = 'name';
        const url = 'url';

        const configMapName = `${name}-config`;

        expect(classUnderTest.buildConfigMap(name, url)).toEqual({
          metadata: {
            name: configMapName,
            labels: {
              'app.kubernetes.io/name': configMapName,
              'app.kubernetes.io/part-of': 'catalyst',
              'app.kubernetes.io/component': 'tools',
              'group': 'catalyst-tools',
            },
            annotations: {
              description: `Config map to hold the url for ${name} in the environment so that other tools can access it`,
            },
          },
          data: {
            NAME_URL: url
          }
        });
      });
    });
  });

  describe('given buildSecret()', () => {
    describe('when called', () => {
      test('then return secret', async () => {
        const name = 'name';
        const username = 'username';
        const password = 'password';

        const secretName = `${name}-access`;

        expect(classUnderTest.buildSecret(name, username, password)).toEqual({
          metadata: {
            name: secretName,
            labels: {
              'app.kubernetes.io/name': secretName,
              'app.kubernetes.io/part-of': 'catalyst',
              'app.kubernetes.io/component': 'tools',
              'group': 'catalyst-tools',
            },
            annotations: {
              description: `Secret to hold the username and password for ${name} so that other components can access it`,
            },
          },
          type: 'Opaque',
          stringData: {
            NAME_USER: username,
            NAME_PASSWORD: password,
          },
        } as Secret);
      });
    });
  });
});
