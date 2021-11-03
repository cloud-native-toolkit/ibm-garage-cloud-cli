import * as chalk from 'chalk';
import {appendFile, fchmod, mkdirp, open, writeFile} from 'fs-extra';
import {homedir} from 'os';
import {join} from 'path';
import {Arguments, Argv} from 'yargs';

export const command = 'install-plugins';
export const desc = 'Install igc commands as plugins to the kubectl and oc clis';
export const builder = (argv: Argv<any>) => argv
  .option('path', {
    alias: 'p',
    type: 'string',
    describe: 'The path where the plugins should be installed',
  });
exports.handler = async (argv: Arguments<{path: string}>) => {
  const path: string = argv.path || join(homedir(), 'bin');

  console.log('Installing plugins into directory: ' + path);
  await mkdirp(path);

  const plugins: PluginScript[] = [
    new PluginScript('', 'igc'),
    new PluginScript('console'),
    new PluginScript('credentials'),
    new PluginScript('dashboard'),
    new PluginScript('enable'),
    new PluginScript('endpoints'),
    new PluginScript('git'),
    new PluginScript('git-secret', 'gitSecret'),
    new PluginScript('gitops'),
    new PluginScript('namespace', 'sync'),
    new PluginScript('pipeline'),
    new PluginScript('tool-config', 'toolConfig'),
  ];

  await Promise.all(plugins.map(p => p.write(path)));

  // if `path` not in PATH
  if (!pathContains(path)) {
    const shellProfile: string = await getShellProfile();

    if (!shellProfile) {
      return;
    }

    await appendFile(shellProfile, `\nexport PATH="$PATH:${path}"\n`);
    console.log('');
    console.log('PATH updated to include plugin path. Run the following to update the current shell:');
    console.log('');
    console.log(`  ${chalk.yellow(`source ${shellProfile}`)}`);
    console.log('');
  }
};

class PluginScript {
  readonly pluginCommand: string;
  readonly command: string;

  constructor(command: string, pluginCommand?: string) {
    this.command = command;
    this.pluginCommand = pluginCommand || command;
  }

  get filename(): string {
    return `kubectl-${this.pluginCommand}`;
  }

  get contents(): string {
    const lines = [
      '#!/bin/bash',
      '',
      `igc ${this.command} "$@"`
    ];

    return lines.join('\n');
  }

  async write(path: string): Promise<string> {
    const abFile: string = join(path, this.filename);

    await writeFile(abFile, this.contents);
    const fd = await open(abFile, 'r');
    await fchmod(fd, 0o777);

    return abFile;
  }
}

const pathContains = (path: string): boolean => {
  return process.env.PATH.split(':').some(p => p === path);
}

const getShellProfile = async (): Promise<string> => {

  const shell: string = process.env.SHELL.replace(/.*\/(,*)/g, '$1');
  switch (shell) {
    case 'zsh':
      return `${homedir()}/.zshrc`;
    case 'bash':
      return `${homedir()}/.bash_profile`;
    default:
      return '';
  }
}
