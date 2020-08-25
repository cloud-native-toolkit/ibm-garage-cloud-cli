import {Container} from 'typescript-ioc';
import {EnablePipeline} from './enable.api';
import {EnablePipelineImpl} from './enable';

export * from './enable.api';
export * from './enable.model';

Container.bind(EnablePipeline).to(EnablePipelineImpl);
