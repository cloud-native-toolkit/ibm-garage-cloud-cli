const path = require('path');
const fs = require('fs');
const rewire = require('rewire');

const registerPipeline = rewire('../../../dist/commands/register-pipeline/register-pipeline');

const extractJenkinsUrl = registerPipeline.__get__('extractJenkinsUrl');
const extractWebhookParams = registerPipeline.__get__('extractWebhookParams');

describe('register-pipeline', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('extractJenkinsUrl()', () => {
    describe('when multi-line string provided', () => {
      const jenkinsUrl='jenkins url value';
      const data = `this is a test line\nthis is another test line\nJENKINS_URL=${jenkinsUrl}`;

      test('return the JENKINS_URL value', () => {
        expect(extractJenkinsUrl(data)).toEqual({jenkinsUrl});
      });
    });
  });

  describe('extractWebhookParams()', () => {
    describe('when file with correct contents provided', () => {
      const filename = path.join(process.cwd(), 'test.yaml');
      const expected = {
        gitUrl: 'gitUrl',
        gitUsername: 'gitUsername',
        gitToken: 'gitToken'
      };

      beforeEach(async () => {
        return fs.promises.writeFile(filename, `git:\n  url: ${expected.gitUrl}\n  username: ${expected.gitUsername}\n  password: ${expected.gitToken}\n`);
      });

      afterEach(async () => {
        return fs.promises.unlink(filename);
      });

      test('should read url, username, and password values', async() => {
        const actual = await extractWebhookParams(filename);

        expect(actual).toEqual(expected);
      });
    });

    describe('when file not found', () => {
      const filename = 'not-a-file.yaml';

      test('throw an error', () => {
        return extractWebhookParams(filename)
          .then(() => { fail('should throw error') })
          .catch(err => {
            expect(err.message).toMatch('ENOENT: no such file or directory');
          });
      });
    });

    describe('when file is empty', () => {
      const filename = 'empty-file.yaml';

      beforeEach(async () => {
        return fs.promises.writeFile(filename, '');
      });

      afterEach(async () => {
        return fs.promises.unlink(filename);
      });

      test('throw an error', () => {
        return extractWebhookParams(filename)
          .then(() => { fail('should throw error') })
          .catch(err => {
            expect(err.message).toMatch('file cannot be parsed');
          });
      });
    });

    describe('when file does not contain yaml', () => {
      const filename = 'non-yaml-file.yaml';

      beforeEach(async () => {
        return fs.promises.writeFile(filename, {git: {url: 'url', username: 'username', password: 'password'}});
      });

      afterEach(async () => {
        return fs.promises.unlink(filename);
      });

      test('throw an error', () => {
        return extractWebhookParams(filename)
          .then(() => { fail('should throw error') })
          .catch(err => {
            expect(err.message).toMatch('webhook contents not found');
          });
      });
    });
  });
});
