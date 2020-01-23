import {Container, Inject, Provides} from 'typescript-ioc';
import * as superagent from 'superagent';
import * as YAML from 'js-yaml';
import * as tar from 'tar';
import * as rimraf from 'rimraf';

import {EnableModel} from './enable.model';
import {QuestionBuilder} from '../../util/question-builder';
import {join} from 'path';
import {existsSync, mkdirSync, readdir} from 'fs';
import {FsPromises} from '../../util/file-util';

export abstract class EnablePipeline {
  async abstract enable(options: EnableModel): Promise<void>;
}

export interface PipelineIndex {
  name?: string;
  url: string;
}

export interface PipelineIndicies {
  name?: string;
  pipelines?: {
    [pipeline: string]: PipelineIndex;
  }
}

@Provides(EnablePipeline)
export class EnablePipelineImpl implements EnablePipeline {
  private debug = false;
  @Inject
  fs: FsPromises;

  async enable(options: EnableModel): Promise<void> {
    if (!options.repo) {
      throw new Error('value required for \'repo\'');
    }

    const pipelinePath = await this.getPipelinePath(options);

    await this.applyPipelineToCurrentDirectory(pipelinePath);
  }

  async getPipelinePath(options: EnableModel): Promise<string> {
    console.log('Looking up pipelines from repository: ' + options.repo);

    const index: PipelineIndicies = await this.getPipelineRepoIndex(options.repo);

    this.log('Pipeline indicies: ', index);

    return await this.promptForPipelineName(index, options.pipeline);
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

  async promptForPipelineName(index: PipelineIndicies = {pipelines: {}}, pipeline?: string): Promise<string> {
    if (!index.pipelines || Object.keys(index.pipelines).length === 0) {
      throw new Error('No pipelines found in repo');
    }

    const questionBuilder: QuestionBuilder<{pipeline: string}> = Container.get(QuestionBuilder);

    const choices = Object.keys(index.pipelines);
    this.log('Pipeline choices', choices);
    pipeline = (await questionBuilder
      .question({
        type: 'list',
        name: 'pipeline',
        message: 'Which pipeline should be enabled?',
        choices
      }, pipeline)
      .prompt()).pipeline;

    const match: PipelineIndex = index.pipelines[pipeline];

    return match.url;
  }

  async applyPipelineToCurrentDirectory(pipelineUrl: string): Promise<void> {
    const path = await this.downloadUrlToPath(pipelineUrl);

    await this.copyFilesFromPath(path, process.cwd());

    await rimraf.sync(path);;
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

  async copyFilesFromPath(fromPath: string, toPath: string): Promise<void> {
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

  async copyFiles(fromPath: string, toPath: string, items: string[]): Promise<void> {

    for (let i = 0; i < items.length; i++) {
      await this.copyFileWithPromptForOverwrite(fromPath, toPath, items[i]);
    }
  }

  async copyFileWithPromptForOverwrite(fromPath: string, toPath: string, fileName: string): Promise<void> {
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

    return this.fs.copyFile(join(fromPath, fileName), join(toPath, fileName));
  }

  log(val1: any, val2: any) {
    if (this.debug) {
      console.log(arguments);
    }
  }
}