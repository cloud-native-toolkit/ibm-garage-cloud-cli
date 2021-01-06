import {Container} from 'typescript-ioc';
import {GetGitParameters} from './git-parameters.api';
import {GitParametersOptions} from './git-parameters-options.model';
import {GitParams} from './git-params.model';
import {execPromise, ExecResult} from '../../util/child-process';
import {QuestionBuilder} from '../../util/question-builder';
import {apiFromUrl, parseGitUrl} from '../../api/git';
import * as chalk from 'chalk';

interface GitQuestion {
  username: string;
  password: string;
  branch: string;
}

export class GetGitParametersImpl implements GetGitParameters {

  async getGitParameters(options: GitParametersOptions = {}, notifyStatus?: (s: string) => void): Promise<GitParams> {

    const parsedGitUrl: {url: string; host: string; owner: string; repo: string; protocol: string; branch?: string} = await this.getGitConfig(options.remote, options.workingDir, options.gitUrl);
    if (!parsedGitUrl.branch) {
      const gitApi = await apiFromUrl(parsedGitUrl.url, {username: options.gitUsername, password: options.gitPat});

      try {
        parsedGitUrl.branch = await gitApi.getDefaultBranch();
      } catch (err) { }
    }

    console.log(`  Project git repo: ${chalk.whiteBright(parsedGitUrl.url)}`);
    if (parsedGitUrl.branch) {
      console.log(`            branch: ${chalk.whiteBright(parsedGitUrl.branch)}`);
    }

    const questionBuilder: QuestionBuilder<GitQuestion> = Container.get(QuestionBuilder)
      .question({
        type: 'input',
        name: 'username',
        message: 'Provide the git username:',
      }, options.gitUsername)
      .question({
        type: 'password',
        name: 'password',
        message: `Provide the git password or personal access token:`,
      }, options.gitPat)
      .question({
        type: 'input',
        name: 'branch',
        message: `Provide the git branch that should be used:`,
        default: 'main',
      }, parsedGitUrl.branch);

    const answers: GitQuestion = await questionBuilder.prompt();

    const result = Object.assign(
      {},
      parsedGitUrl,
      {
        name: options.name || `${parsedGitUrl.owner}.${parsedGitUrl.repo}${answers.branch !== 'master' ? '.' + answers.branch : ''}`,
      },
      answers,
    );

    return result;
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
    );

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
