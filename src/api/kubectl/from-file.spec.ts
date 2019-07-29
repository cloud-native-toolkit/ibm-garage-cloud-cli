import rewire = require('rewire');

const module = rewire('./from-file');

const apply = module.__get__('apply');
const create = module.__get__('create');

describe('from-file', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('apply()', () => {

    let mock_spawnPromise;
    let unset_spawnPromise;

    beforeEach(() => {
      mock_spawnPromise = jest.fn();
      unset_spawnPromise = module.__set__('spawnPromise', mock_spawnPromise) as () => void;
    });

    afterEach(() => {
      unset_spawnPromise();
    });

    test('should execute `kubectl apply` for given file name and namespace', async () => {
      const namespace = 'namespace';
      const fileName = 'file.json';

      await apply(fileName, namespace);

      expect(mock_spawnPromise.mock.calls.length).toEqual(1);
      expect(mock_spawnPromise.mock.calls[0][0]).toEqual('kubectl');
      expect(mock_spawnPromise.mock.calls[0][1]).toEqual(['apply', '-n', namespace, '-f', fileName]);
    });
  });

  describe('create()', () => {

    let mock_spawnPromise;
    let unset_spawnPromise;

    beforeEach(() => {
      mock_spawnPromise = jest.fn();
      unset_spawnPromise = module.__set__('spawnPromise', mock_spawnPromise) as () => void;
    });

    afterEach(() => {
      unset_spawnPromise();
    });

    test('should execute `kubectl create` for given file name and namespace', async () => {
      const namespace = 'namespace';
      const fileName = 'file.json';

      await create(fileName, namespace);

      expect(mock_spawnPromise.mock.calls.length).toEqual(1);
      expect(mock_spawnPromise.mock.calls[0][0]).toEqual('kubectl');
      expect(mock_spawnPromise.mock.calls[0][1]).toEqual(['create', '-n', namespace, '-f', fileName]);
    });
  });
});
