import {CreateServiceAccountImpl} from './create-service-account';
import {Container} from 'typescript-ioc';

describe('create-service-account', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  let classUnderTest: CreateServiceAccountImpl;
  beforeEach(() => {
    classUnderTest = Container.get(CreateServiceAccountImpl);
  });

  describe('given updateSecretList()', () => {
    describe('when new secrets are provided', () => {
      test('then the secret should be added', async () => {
        const existingSecrets = [{name: 'secret1'}, {name: 'secret2'}];
        const candidateSecret = ['newsecret'];

        expect(
          classUnderTest.updateSecretList(existingSecrets, candidateSecret)
        ).toEqual(
          {changed: true, updatedSecrets: existingSecrets.concat([{name: 'newsecret'}])}
        );
      });
    });

    describe('when an existing secret is provided', () => {
      test('then don\'t add it', async () => {
        const existingSecrets = [{name: 'secret1'}, {name: 'secret2'}];
        const candidateSecret = ['secret2'];

        expect(
          classUnderTest.updateSecretList(existingSecrets, candidateSecret)
        ).toEqual(
          {changed: false, updatedSecrets: existingSecrets}
        );
      });
    });
  });

});