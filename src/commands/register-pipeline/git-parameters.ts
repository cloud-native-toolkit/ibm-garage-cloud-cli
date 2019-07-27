import * as inquirer from 'inquirer';

import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {execPromise, ExecResult} from '../../util/child_process';
import {GitParams} from './create-git-secret';

// set these variables here so they can be replaced by rewire
let prompt = inquirer.prompt;

export async function getGitParameters(options: RegisterPipelineOptions = {}): Promise<GitParams> {

  const parsedGitUrl = parseGitUrl(await getRemoteGitUrl(options.workingDir));

  const questions: inquirer.Questions<{username: string; password: string; branch: string}> = [{
    type: 'input',
    name: 'username',
    message: `Please provide the username for ${parsedGitUrl.url}:`,
    default: options.gitUsername,
  }, {
    type: 'password',
    name: 'password',
    message: `Please provide your password/personal access token:`,
    default: options.gitPat,
  }, {
    type: 'input',
    name: 'branch',
    message: `Please provide the branch the pipeline should use:`,
    default: 'master',
  }];

  const answers = await prompt(questions);

  return {
    url: parsedGitUrl.url,
    name: `${parsedGitUrl.org}.${parsedGitUrl.repo}`,
    username: answers.username,
    password: answers.password,
    branch: answers.branch,
  };
}

const GIT_URL_PATTERNS = {
  'http': 'https{0,1}://(.*)/(.*)/(.*).git',
  'git@': 'git@(.*):(.*)/(.*).git'
};

function parseGitUrl(url: string): {url: string; org: string; repo: string} {
  const pattern = GIT_URL_PATTERNS[url.substring(0, 4)];

  if (!pattern) {
    throw new Error(`invalid git url: ${url}`);
  }

  const results = new RegExp(pattern, 'gi')
    .exec(url.endsWith('.git') ? url : `${url}.git`);

  if (!results || results.length < 4) {
    throw new Error(`invalid git url: ${url}`);
  }

  const host = results[1];
  const org = results[2];
  const repo = results[3];

  return {
    url: `https://${host}/${org}/${repo}.git`,
    org,
    repo
  };
}

async function getRemoteGitUrl(workingDir: string = process.cwd()): Promise<string> {
  return execPromise(
    'git remote get-url origin',
    {
      cwd: workingDir
    },
  ).then(({stdout}: ExecResult) => stdout.toString().trim());
}
