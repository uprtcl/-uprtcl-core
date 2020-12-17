import { interfaces } from 'inversify';

import { MicroModule } from '@uprtcl/micro-orchestrator';

import { PatternRecognizer } from './recognizer/pattern-recognizer';
import { Behaviour } from './types/behaviour';
import { CortexBindings } from './bindings';

export class CortexModule extends MicroModule {
  static id = 'cortex-module';

  static bindings = CortexBindings;

  async onLoad(container: interfaces.Container): Promise<void> {
    let recognizer: PatternRecognizer | undefined = undefined;
    container
      .bind<PatternRecognizer>(CortexModule.bindings.Recognizer)
      .toDynamicValue((ctx: interfaces.Context) => {
        if (recognizer) return recognizer;

        recognizer = new PatternRecognizer();

        const patterns = ctx.container.getAll<Behaviour<any>>(
          CortexModule.bindings.Pattern
        );
        recognizer.patterns = patterns;

        return recognizer;
      });
  }

  get submodules() {
    return [];
  }
}
