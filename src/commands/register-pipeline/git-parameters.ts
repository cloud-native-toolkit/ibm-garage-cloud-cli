import {prompt, Question, Questions} from 'inquirer';
import {Provides} from 'typescript-ioc';

import {RegisterPipelineOptions} from './register-pipeline-options.model';
import {execPromise, ExecResult} from '../../util/child-process';
import {GitParams} from './create-git-secret';

export abstract class GetGitParameters {
  async abstract getGitParameters(options?: RegisterPipelineOptions): Promise<GitParams>;
}

export class QuestionBuilder<T> {
  private readonly _questions: Array<Question<T>> = [];
  private readonly _values: T = {} as any;

  question(question: Question<T>, value?: string): QuestionBuilder<T> {
    if (!value) {
      this._questions.push(question);
    } else {
      this._values[question.name] = value;
    }

    return this;
  }

  async prompt(): Promise<T> {
    const promptValues = this._questions.length > 0 ? await prompt(this._questions) : {};

    return Object.assign({}, this._values, promptValues);
  }
}

interface GitQuestion {
  username: string;
  password: string;
  branch: string;
}

@Provides(GetGitParameters)
export class GetGitParametersImpl implements GetGitParameters {

  private readonly GIT_URL_PATTERNS = {
    'http': 'https{0,1}://(.*)/(.*)/(.*).git',
    'git@': 'git@(.*):(.*)/(.*).git'
  };

  async getGitParameters(options: RegisterPipelineOptions = {}): Promise<GitParams> {

    const parsedGitUrl: {url: string; org: string; repo: string} = this.parseGitUrl(await this.getRemoteGitUrl(options.workingDir));
    const currentBranch: string = await this.getCurrentBranch(options.workingDir);

    console.log(`  Project git repo: ${parsedGitUrl.url}`);

    const questionBuilder = new QuestionBuilder<GitQuestion>()
      .question({
        type: 'input',
        name: 'username',
        message: `Provide the username:`,
      }, options.gitUsername)
      .question({
        type: 'password',
        name: 'password',
        message: `Provide your password/personal access token:`,
      }, options.gitPat)
      .question({
        type: 'input',
        name: 'branch',
        message: `Provide the branch the pipeline should use:`,
        default: currentBranch,
      });

    const answers: GitQuestion = await questionBuilder.prompt();

    const result = Object.assign(
      {},
      parsedGitUrl,
      {
        name: `${parsedGitUrl.org}.${parsedGitUrl.repo}${answers.branch !== 'master' ? '.' + answers.branch : ''}`,
      },
      answers,
    );

    return result;
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

  async getCurrentBranch(workingDir: string = process.cwd()): Promise<string> {
    return execPromise(
      'git rev-parse --abbrev-ref HEAD',
      {
        cwd: workingDir
      },
    ).then(({stdout}: ExecResult) => stdout.toString().trim());
  }
}
