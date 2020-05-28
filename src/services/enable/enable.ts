import {Container, Inject} from 'typescript-ioc';
import * as superagent from 'superagent';
import * as YAML from 'js-yaml';
import * as tar from 'tar';
import * as rimraf from 'rimraf';
import {join} from 'path';
import {existsSync, mkdirSync, readdir} from 'fs';

import {
  EnablePipeline,
  EnablePipelineResult,
  PipelineIndex,
  PipelineIndicies,
  PipelineVersionNotFound
} from './enable.api';
import {EnablePipelineModel} from './enable.model';
import {QuestionBuilder} from '../../util/question-builder';
import {FsPromises} from '../../util/file-util';

export class EnablePipelineImpl implements EnablePipeline {
  private debug = false;
  @Inject
  fs: FsPromises;

  async enable(options: EnablePipelineModel): Promise<EnablePipelineResult> {
    if (!options.repo) {
      throw new Error('value required for \'repo\'');
    }

    const {pipeline, branch} = await this.getPipelinePath(options);

    const filesChanged: string[] = await this.applyPipelineToCurrentDirectory(pipeline);

    return {
      repository: options.repo,
      pipeline,
      branch,
      filesChanged,
    }
  }

  async getPipelinePath(options: EnablePipelineModel): Promise<{pipeline: PipelineIndex, branch: string}> {

    const index: PipelineIndicies = await this.getPipelineRepoIndex(options.repo);

    return await this.promptForPipelineName(index, options);
  }

  async getPipelineRepoIndex(repoUrl: string): Promise<PipelineIndicies> {
    try {
      const res: superagent.Response = await superagent.get(`${repoUrl}/index.yaml`);

      this.log('Response from pipeline repo: ', res.text);

      return YAML.load(res.text);
    } catch (err) {
      throw new Error(`Error loading pipeline index from ${repoUrl}`);
    }
  }

  async promptForPipelineName(index: PipelineIndicies = {pipelines: {}, branches: {}}, options: EnablePipelineModel): Promise<{pipeline: PipelineIndex, branch: string}> {
    if (index.version != 'v2') {
      throw new Error('Pipeline version is newer than CLI');
    }

    if (!index.branches || Object.keys(index.branches[options.branch] || {}).length === 0) {
      throw new Error(`No pipelines found in repo for branch: ${options.branch}`);
    }

    const questionBuilder: QuestionBuilder<{pipeline: string}> = Container.get(QuestionBuilder);

    const choices = Object.keys(index.branches[options.branch]);
    this.log('Pipeline choices', choices);
    const pipeline = (await questionBuilder
      .question({
        type: 'list',
        name: 'pipeline',
        message: 'Which pipeline should be enabled?',
        choices
      }, options.pipeline)
      .prompt()).pipeline;

    const branchPipeline = index.branches[options.branch][pipeline];
    const pipelinesVersions: PipelineIndex[] = branchPipeline
      .filter((val: PipelineIndex) => val.version === options.release);

    if (pipelinesVersions.length === 0) {
      throw new PipelineVersionNotFound(
        `No pipelines found in repo for branch and version: ${options.branch}/${options.pipeline}/${options.release}`,
        options.branch,
        pipeline,
        pipelinesVersions.map(val => val.version)
      );
    }

    return {pipeline: pipelinesVersions[0], branch: options.branch};
  }

  async applyPipelineToCurrentDirectory(pipeline: PipelineIndex): Promise<string[]> {
    const path = await this.downloadUrlToPath(pipeline.url);

    const filesChanged: string[] = await this.copyFilesFromPath(path, process.cwd());

    await rimraf.sync(path);

    return filesChanged;
  }

  async downloadUrlToPath(pipelinePath: string): Promise<string> {
    const request: superagent.Request = superagent.get(pipelinePath);

    const path = join(process.cwd(), 'tmp.enable');
    if (existsSync(path)) {
      await rimraf.sync(path);
    }
    mkdirSync(path);

    request.pipe(tar.x({
      cwd: path
    }));

    console.log('piping stream');

    return new Promise<string>(resolve => {
      request.on('end', () => {
        resolve(path);
      });
    });
  }

  async copyFilesFromPath(fromPath: string, toPath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      readdir(fromPath, (err, items) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(this.copyFiles(fromPath, toPath, items));
      });
    })
  }

  async copyFiles(fromPath: string, toPath: string, items: string[]): Promise<string[]> {

    const changedFiles: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const changedFile = await this.copyFileWithPromptForOverwrite(fromPath, toPath, items[i]);

      changedFiles.push(changedFile);
    }

    return changedFiles.filter(fileName => !!fileName);
  }

  async copyFileWithPromptForOverwrite(fromPath: string, toPath: string, fileName: string): Promise<string | undefined> {
    if (existsSync(join(toPath, fileName))) {
      const prompt: QuestionBuilder<{overwrite: true}> = Container.get(QuestionBuilder);

      const {overwrite} = await prompt.question({
        name: 'overwrite',
        message: `${fileName} already exists. Do you want to overwrite it?`,
        type: 'confirm',
      }).prompt();

      if (!overwrite) {
        return;
      }
    }

    await this.fs.copyFile(join(fromPath, fileName), join(toPath, fileName));

    return fileName;
  }

  log(val1: any, val2: any) {
    if (this.debug) {
      console.log(arguments);
    }
  }
}