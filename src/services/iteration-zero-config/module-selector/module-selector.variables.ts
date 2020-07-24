import {BaseVariable, IBaseVariable} from '../variables.model';
import {ModuleVariable} from './module-selector.model';
import {TerraformVariable} from './module-selector.api';

export interface IModuleVariable extends IBaseVariable {
  moduleRef: {source: string};
  moduleOutputName: string;
}

export class ModuleRefVariable implements IModuleVariable, BaseVariable {
  name: string;
  description?: string;
  type?: string;

  moduleRef: {source: string};
  moduleOutputName: string;

  constructor(values: IModuleVariable) {
    Object.assign(this, values);
  }

  asString(stages: {[name: string]: {name: string}}): string {
    const module: {name: string} = stages[this.moduleRef.source];
    return `${this.name} = module.${module.name}.${this.moduleOutputName}\n`;
  }
}

export function isModuleRefVariable(value: IBaseVariable): value is ModuleRefVariable {
  return (!!value) && !!(value as ModuleRefVariable).moduleRef;
}

export interface IGlobalRefVariable extends IBaseVariable {
  variableName: string;
}

export class GlobalRefVariable implements IGlobalRefVariable, BaseVariable {
  name: string;
  description?: string;
  type?: string;

  variableName: string;

  constructor(values: IGlobalRefVariable) {
    Object.assign(this, values);
  }

  asString(stages: {[name: string]: {name: string}}): string {
    return `${this.name} = var.${this.variableName}\n`;
  }
}

export function isGlobalRefVariable(value: IBaseVariable): value is GlobalRefVariable {
  return (!!value) && !!(value as GlobalRefVariable).variableName;
}

export interface IPlaceholderVariable extends IBaseVariable {
  variable: ModuleVariable;
}

export class PlaceholderVariable implements IPlaceholderVariable, BaseVariable {
  name: string;
  description?: string;
  type?: string;

  variable: ModuleVariable;

  constructor(props: IPlaceholderVariable) {
    Object.assign(this, props);
  }

  asString(): string {
    return '';
  }
}

export function isPlaceholderVariable(value: IBaseVariable): value is PlaceholderVariable {
  return (!!value) && !!(value as PlaceholderVariable).variable;
}

export function fromBaseVariable(variable: IBaseVariable): BaseVariable {
  if (isGlobalRefVariable(variable)) {
    return new GlobalRefVariable(variable);
  } else if (isModuleRefVariable(variable)) {
    return new ModuleRefVariable(variable);
  } else if (isPlaceholderVariable(variable)) {
    return new PlaceholderVariable(variable);
  } else {
    throw new Error('Unknown variable type: ' + JSON.stringify(variable));
  }
}

export class TerraformVariableImpl implements TerraformVariable {
  name: string;
  private _type: string;
  private _description: string;
  private _value: string;

  constructor(values: {name: string, value: string, type?: string, description?: string}) {
    Object.assign(this, values);
  }

  get type() {
    return this._type;
  }
  set type(type: string) {
    this._type = type || 'string';
  }

  get value() {
    return this._value;
  }
  set value(value: string) {
    this._value = value || '';
  }

  get description() {
    return this._description;
  }
  set description(description: string) {
    this._description = description || `the value of ${name}`;
  }

  asString(): string {
    return `
variable "${this.name}" {
  type = ${this.type}
  description = "${this.description}"
  ${this.defaultValueProp()}
}
`;
  }

  defaultValueProp(): string {
    if (!this.value) {
      return '';
    }

    let value;
    if (this.type === 'bool' || this.type === 'number') {
      value = this.value;
    } else {
      value = `"${this.value}"`;
    }

    return `default = ${value}`
  }
}
