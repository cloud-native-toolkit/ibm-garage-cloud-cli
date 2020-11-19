import {AbstractKubeNamespace} from './namespace';
import {Project} from './project';
import {ChildProcess} from '../../util/child-process';

export class OcpProjectCli implements AbstractKubeNamespace<Project> {

  async create(name: string): Promise<Project> {
    const childProcess = new ChildProcess();

    await childProcess.exec(`oc new-project ${name}`);

    return this.buildProject(name);
  }

  buildProject(name: string): Project {
    return {
      apiVersion: 'project.openshift.io/v1',
      kind: 'Project',
      metadata: {
        name
      },
      status: {}
    }
  }

  async list(): Promise<Project[]> {
    const childProcess = new ChildProcess();

    const {stdout, stderr} = await childProcess.exec('oc projects -q');

    return stdout.toString().split(/\r?\n/).map(this.buildProject);
  }

  async exists(name: string): Promise<boolean> {
    const projects: Project[] = await this.list();

    return projects.filter(p => p.metadata.name === name).length > 0;
  }
}
