import {prompt, Questions} from 'inquirer';
import {Provides} from 'typescript-ioc';

import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {execPromise, ExecResult} from '../../util/child-process';
import {GitParams} from './create-git-secret';

export abstract class GetGitParameters {
  async abstract getGitParameters(options?: RegisterPipelineOptions): Promise<GitParams>;
}

@Provides(GetGitParameters)
export class GetGitParametersImpl implements GetGitParameters {

  private readonly GIT_URL_PATTERNS = {
    'http': 'https{0,1}://(.*)/(.*)/(.*).git',
    'git@': 'git@(.*):(.*)/(.*).git'
  };

  async getGitParameters(options: RegisterPipelineOptions = {}): Promise<GitParams> {

    const parsedGitUrl = this.parseGitUrl(await this.getRemoteGitUrl(options.workingDir));

    const questions: Questions<{username: string; password: string; branch: string}> = [{
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

  parseGitUrl(url: string): {url: string; org: string; repo: string} {
    const pattern = this.GIT_URL_PATTERNS[url.substring(0, 4)];

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

  async getRemoteGitUrl(workingDir: string = process.cwd()): Promise<string> {
    return execPromise(
      'git remote get-url origin',
      {
        cwd: workingDir
      },
    ).then(({stdout}: ExecResult) => stdout.toString().trim());
  }
}
