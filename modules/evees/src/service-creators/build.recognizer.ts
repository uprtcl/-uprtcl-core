import { PatternRecognizer } from '@uprtcl/cortex';
import { EveesContentModule } from '../evees.content.module';

export const buildRecognizer = (modules: EveesContentModule[]): PatternRecognizer => {
  const patterns = modules.map((module) => module.getPatterns());
  const recognizer = new PatternRecognizer(patterns);

  // [
  //   new WikiPattern([WikiCommon, WikiLinks]),
  //   new TextNodePattern([TextNodeCommon, TextNodeTitle]),
  // ]

  return recognizer;
};
