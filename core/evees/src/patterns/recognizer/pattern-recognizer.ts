import { Pattern } from '../interfaces/pattern';
import { Behaviour } from '../interfaces/behaviour';

export class PatternRecognizer {
  constructor(readonly patterns: Pattern<any>[]) {}

  public recognize<T>(object: T): Pattern<T>[] {
    if (!object) {
      throw new Error('The given object was not defined');
    }

    const recognizedPatterns = this.patterns
      .filter((pattern) => pattern.recognize(object))
      .map((p) => ({ ...p }));

    return recognizedPatterns as Pattern<T>[];
  }

  /**
   * Recognizes all behaviours for the given object, flattening the array
   *
   * @param object object for which to recognize the behaviour
   */
  public recognizeBehaviours<T>(object: T): Behaviour<T>[] {
    const patterns: Pattern<T>[] = this.recognize(object);

    const behaviours = patterns.map((p) => p.behaviours);
    return ([] as Behaviour<T>[]).concat(...behaviours);
  }

  /**
   * Gets all the behaviours that the pattern with the given type implements
   *
   * @param type type of the pattern of which to return the behaviours
   */
  public getTypeBehaviours<T>(type: string): Behaviour<T>[] {
    const patterns = this.patterns.filter((pattern) => pattern.type === type);

    const behaviours = patterns.map((p) => p.behaviours);
    return ([] as Behaviour<T>[]).concat(...behaviours);
  }

  /**
   * Recognizes the type of the given entity
   *
   * @param entity to recognize the type for
   * @throws error if no pattern recognized the given entity
   * @throws error if two patterns with different types recognized the given entity
   */
  public recognizeType<T>(object: T): string {
    const patterns: Pattern<T>[] = this.recognize(object);

    const types: string[] = patterns.map((p) => p.type).filter((t) => !!t) as string[];

    if (types.length === 0) {
      throw new Error(`No entity found to recognize object ${JSON.stringify(object)}`);
    }

    const abmiguousError = types.length > 1 && !types.every((t) => types[0]);

    if (abmiguousError) {
      throw new Error(
        `Ambiguous error recognizing entity: ${parent.toString()}. These two types recognized the object ${types.toString()}`
      );
    }

    return types[0];
  }
}
