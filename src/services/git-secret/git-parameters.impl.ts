import {Container} from 'typescript-ioc';
import {GetGitParameters} from './git-parameters.api';
import {GitParametersOptions} from './git-parameters-options.model';
import {GitParams} from './git-params.model';
import {execPromise, ExecResult} from '../../util/child-process';
import {QuestionBuilder} from '../../util/question-builder';
import {apiFromUrl, GitApi, parseGitUrl} from '@cloudnativetoolkit/git-client';
import * as chalk from 'chalk';

interface GitQuestion {
  username: string;
  password: string;
}

export class NoGitRepo extends Error {
  constructor(message: string, public readonly directory) {
    super(message);
  }
}

export const isNoGitRepoError = (error: Error): error is NoGitRepo => {
  return !!error && !!(error as NoGitRepo).directory;
}

export class GetGitParametersImpl implements GetGitParameters {

  async getGitParameters(options: GitParametersOptions = {}, notifyStatus?: (s: string) => void): Promise<GitParams> {

    const parsedGitUrl: {url: string; host: string; owner: string; repo: string; protocol: string; branch?: string; username?: string; password?: string} = await this.getGitConfig(options.remote, options.workingDir, options.gitUrl);

    console.log(`  Project git repo: ${chalk.whiteBright(parsedGitUrl.url)}`);

    const questionBuilder: QuestionBuilder<GitQuestion> = Container.get(QuestionBuilder)
      .question({
        type: 'input',
        name: 'username',
        message: 'Provide the git username:',
      }, options.gitUsername || parsedGitUrl.username)
      .question({
        type: 'password',
        name: 'password',
        message: `Provide the git password or personal access token:`,
      }, options.gitPat || parsedGitUrl.password);

    const gitCredentials: GitQuestion = await questionBuilder.prompt();

    if (!parsedGitUrl.branch) {
      const gitApi = await this.getApiFromUrl(parsedGitUrl.url, gitCredentials);

      try {
        parsedGitUrl.branch = await gitApi.getDefaultBranch();
      } catch (err) { }
    }

    const branchQuestion: QuestionBuilder<{branch: string}> = Container.get(QuestionBuilder)
      .question({
        type: 'input',
        name: 'branch',
        message: `Provide the git branch that should be used:`,
        default: 'main',
      }, parsedGitUrl.branch);

    const branchAnswer: {branch: string} = await branchQuestion.prompt();

    console.log(`  Branch: ${chalk.whiteBright(parsedGitUrl.branch)}`);

    const result = Object.assign(
      {},
      parsedGitUrl,
      {
        name: options.name || `${parsedGitUrl.owner}.${parsedGitUrl.repo}${branchAnswer.branch === 'master' || branchAnswer.branch === 'main' ? '' : '.' + branchAnswer.branch}`,
      },
      gitCredentials,
      branchAnswer,
    );

    return result;
  }

  async getApiFromUrl(url: string, credentials: {username: string, password: string}): Promise<GitApi> {
    return apiFromUrl(url, credentials);
  }

  async getGitConfig(remote: string = 'origin', workingDir: string = process.cwd(), gitUrl?: string): Promise<{url: string; host: string; owner: string; repo: string; protocol: string; branch?: string}> {
    if (!gitUrl) {
      const url = await this.getRemoteGitUrl(remote, workingDir);
      const branch = await this.getCurrentBranch(workingDir);

      gitUrl = `${url}#${branch}`;
    }

    return parseGitUrl(gitUrl);
  }

  async getRemoteGitUrl(remote: string = 'origin', workingDir: string = process.cwd()): Promise<string> {
    const {stdout} = await execPromise(
      `git remote -v`,
      {
        cwd: workingDir
      },
    ).catch(err => {
      if (/not a git repository/.test(err.message)) {
        throw new NoGitRepo(err.message, workingDir)
      }
      throw err
    });

    const lines: string[] = stdout.toString().trim().split(/\r?\n/);

    const test = new RegExp(`${remote}\\s+(.*)\\s+.push.*`);
    const gitUrls = lines
      .filter(line => test.test(line))
      .map(line => line.replace(test, '$1'));

    if (gitUrls.length == 0) {
      throw new Error('Git url not found');
    }

    return gitUrls[0];
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
