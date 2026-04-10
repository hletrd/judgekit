import { nanoid } from "nanoid";

export type ProblemTestCaseDraft = {
  _key?: string;
  input: string;
  expectedOutput: string;
  isVisible: boolean;
  _inputDirty?: boolean;
  _outputDirty?: boolean;
  _originalInput?: string;
  _originalExpectedOutput?: string;
};

export function createEmptyProblemTestCaseDraft(): ProblemTestCaseDraft {
  return {
    _key: nanoid(),
    input: "",
    expectedOutput: "",
    isVisible: false,
  };
}

export function createInitialProblemTestCaseDrafts(
  testCases: Array<Pick<ProblemTestCaseDraft, "input" | "expectedOutput" | "isVisible">>
): ProblemTestCaseDraft[] {
  return testCases.map((testCase) => ({
    ...testCase,
    _key: nanoid(),
    _originalInput: testCase.input,
    _originalExpectedOutput: testCase.expectedOutput,
  }));
}

export function serializeProblemTestCaseDraftsForMutation(
  testCases: ProblemTestCaseDraft[],
  isEditing: boolean
) {
  return testCases.map(
    ({
      _key,
      _inputDirty,
      _outputDirty,
      _originalInput,
      _originalExpectedOutput,
      ...rest
    }) => {
      void _key;
      void _inputDirty;
      void _outputDirty;

      if (!isEditing || (_originalInput === undefined && _originalExpectedOutput === undefined)) {
        return rest;
      }

      return {
        ...rest,
        input: _originalInput === rest.input ? undefined : rest.input,
        expectedOutput:
          _originalExpectedOutput === rest.expectedOutput ? undefined : rest.expectedOutput,
      };
    }
  );
}
