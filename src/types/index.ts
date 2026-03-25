export * from './serviceResult';
export interface VoiceMacro {
  id: string;
  keyword: string;
  expansion: string;
  category?: 'gross' | 'micro' | 'general'; // Optional: helps organize macros later
}
// As you add more types (like VoiceMacro or AIConfig), add them here:
// export * from './voiceMacros';
