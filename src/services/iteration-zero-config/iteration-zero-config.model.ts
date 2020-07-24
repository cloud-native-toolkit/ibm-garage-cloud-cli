
export interface IterationZeroConfigModel {
  clusterType?: string;
  catalogUrl?: string;
  input?: string;
  ci?: boolean;
}

export interface InputStageVariable {
  name: string;
  variableName?: string;
  value?: string;
}

export interface InputStage {
  source: string;
  version?: string;
  variables?: InputStageVariable[];
}

export interface InputVariable {
  name: string;
  defaultValue?: string;
}

export interface InputModel {
  platform: 'ocp4' | 'ocp3' | 'kubernetes';
  stages: InputStage[];
  variables: InputVariable[];
}
