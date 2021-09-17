import {Arguments, Argv} from 'yargs';
import {writeFile} from 'fs-extra';
import {join} from 'path';

interface PluginDef {
  name: string;
  command?: string;
}

function isPluginDef(value: string | PluginDef): value is PluginDef {
  return (!!value && !!(value as PluginDef).name)
}

const plugins: Array<string | PluginDef> = [
  {name: 'igc'},
  'console',
  'credentials',
  'dashboard',
  'enable',
  'endpoints',
  'git',
  'gitops',
  {name: 'gitsecret', command: 'git-secret'},
  'pipeline',
  'sync',
  {name: 'toolconfig', command: 'tool-config'},
]

export const command = 'plugins';
export const desc = 'Installs the igc commands as a plugin to the kubectl and oc clis';
export const builder = (argv: Argv<any>) => argv
  .option('path', {
    require: false,
    describe: 'The directory where the plugin commands will be installed. If not provided will default to the directory where igc has been installed',
  });
exports.handler = async (argv: Arguments<{path: string}>) => {
  const pluginPath = argv.path ? argv.path : __dirname;

  const promises: Promise<string>[] = plugins.map(plugin => {
    const name = isPluginDef(plugin) ? plugin.name : plugin;
    const command = isPluginDef(plugin) ? plugin.command : plugin;

    const filename = `kubectl-${name}`;
    return writeFile(join(pluginPath, filename), buildFileContent(command), {mode: 0o755}).then(() => filename);
  });

  const filenames: string[] = await Promise.all(promises);

  console.log('Installed plugins in ' + pluginPath + ":");
  filenames.forEach(f => console.log(`  ${f}`));
};

const buildFileContent = (command: string = '') => {
  return `#!/bin/bash
  
igc ${command} "$@"
`;
}
