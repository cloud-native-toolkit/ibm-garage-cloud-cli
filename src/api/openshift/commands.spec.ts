import rewire = require('rewire');

const module = rewire('./commands');

const apply = module.__get__('apply');
const create = module.__get__('create');
const startBuild = module.__get__('startBuild');

describe('commands', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  let mock_spawnPromise;
  let unset_spawnPromise;

  beforeEach(() => {
    mock_spawnPromise = jest.fn();
    unset_spawnPromise = module.__set__('spawnPromise', mock_spawnPromise) as () => void;
  });

  afterEach(() => {
    unset_spawnPromise();
  });

  describe('startBuild()', () => {
    test('should execute `oc start-build` for given file name and namespace', async () => {
      const pipelineName = 'pipelineName';
      const namespace = 'namespace';

      await startBuild(pipelineName, namespace);

      expect(mock_spawnPromise).toHaveBeenCalledWith(
        'oc',
        ['start-build', pipelineName, '-n', namespace],
        {
          env: process.env
        },
        false,
      );
    });
  });

  describe('apply()', () => {
    test('should execute `oc apply` for given file name and namespace', async () => {
      const namespace = 'namespace';
      const fileName = 'file.json';

      await apply(fileName, namespace);

      expect(mock_spawnPromise).toHaveBeenCalledWith(
        'oc',
        ['apply', '-n', namespace, '-f', fileName],
        {
          env: process.env
        },
        false,
      );
    });
  });

  describe('create()', () => {
    test('should execute `oc create` for given file name and namespace', async () => {
      const namespace = 'namespace';
      const fileName = 'file.json';

      await create(fileName, namespace);

      expect(mock_spawnPromise).toHaveBeenCalledWith(
        'oc',
        ['create', '-n', namespace, '-f', fileName],
        {
          env: process.env
        },
        false,
      );
    });
  });
});
