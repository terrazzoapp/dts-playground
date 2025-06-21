import Editor, { type EditorProps, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

const MONACO_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  detectIndentation: true,
  fontFamily: 'Fragment Mono',
  fontSize: 11,
  formatOnType: true,
  minimap: { enabled: false },
  automaticLayout: true,
  tabSize: 2,
  trimAutoWhitespace: true,
};

self.MonacoEnvironment = {
  getWorker(_, label) {
    switch (label) {
      case 'json': {
        return new jsonWorker();
      }
      default: {
        return new editorWorker();
      }
    }
  },
};

loader.config({ monaco });
loader.init();

export default function CodeEditor({
  defaultLanguage = 'json',
  theme = 'vs-dark',
  options,
  ...props
}: EditorProps) {
  return (
    <Editor
      {...props}
      theme={theme}
      options={{ ...MONACO_OPTIONS, ...options }}
      defaultLanguage={defaultLanguage}
    />
  );
}
