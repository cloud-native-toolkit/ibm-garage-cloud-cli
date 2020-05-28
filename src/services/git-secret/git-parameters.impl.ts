import {Container} from 'typescript-ioc';
import {GetGitParameters} from './git-parameters.api';
import {GitParametersOptions} from './git-parameters-options.model';
import {GitParams} from './git-params.model';
import {execPromise, ExecResult} from '../../util/child-process';
import {QuestionBuilder} from '../../util/question-builder';

interface GitQuestion {
  username: string;
  password: string;
  branch: string;
}

export class GetGitParametersImpl implements GetGitParameters {

  private readonly GIT_URL_PATTERNS = {
    'http': 'https{0,1}://(.*)/(.*)/(.*).git',
    'git@': 'git@(.*):(.*)/(.*).git'
  };

  async getGitParameters(options: GitParametersOptions = {}, notifyStatus?: (s: string) => void): Promise<GitParams> {

    const parsedGitUrl: {url: string; host: string; org: string; repo: string} = this.parseGitUrl(await this.getRemoteGitUrl(options.workingDir));
    const currentBranch: string = await this.getCurrentBranch(options.workingDir);

    console.log(`  Project git repo: ${parsedGitUrl.url}`);

    const questionBuilder: QuestionBuilder<GitQuestion> = Container.get(QuestionBuilder)
      .question({
        type: 'input',
        name: 'username',
        message: 'Provide the git username:',
      }, options.gitUsername)
      .question({
        type: 'password',
        name: 'password',
        message: `Provide the git personal access token:`,
      }, options.gitPat)
      .question({
        type: 'input',
        name: 'branch',
        message: `Provide the git branch that should be used:`,
        default: currentBranch,
      });

    const answers: GitQuestion = await questionBuilder.prompt();

    const result = Object.assign(
      {},
      parsedGitUrl,
      {
        name: options.name || `${parsedGitUrl.org}.${parsedGitUrl.repo}${answers.branch !== 'master' ? '.' + answers.branch : ''}`,
      },
      answers,
    );

    return result;
  }

  parseGitUrl(url: string): {url: string; host: string; org: string; repo: string} {
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
      host,
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
