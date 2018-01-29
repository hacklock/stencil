import * as d from './index';


export interface BuildCtx {
  buildId: number;
  requiresFullBuild: boolean;
  diagnostics: d.Diagnostic[];
  entryModules: d.EntryModule[];
  entryPoints: d.EntryPoint[];
  moduleFiles: d.ModuleFile[];
  global?: d.ModuleFile;
  transpileBuildCount: number;
  bundleBuildCount: number;
  appFileBuildCount: number;
  indexBuildCount: number;
  aborted: boolean;
  timeSpan: d.LoggerTimeSpan;
  startTime: number;
  hasChangedJsText: boolean;
  filesWritten: string[];
  filesDeleted: string[];
  dirsDeleted: string[];
  dirsAdded: string[];
  filesChanged: string[];
  filesUpdated: string[];
  filesAdded: string[];
  shouldAbort?(): boolean;
  finish?(): Promise<BuildResults>;
}


export interface BuildResults {
  buildId: number;
  diagnostics: d.Diagnostic[];
  hasError: boolean;
  aborted?: boolean;
  duration: number;
  isRebuild: boolean;
  transpileBuildCount: number;
  bundleBuildCount: number;
  hasChangedJsText: boolean;
  dirsAdded: string[];
  dirsDeleted: string[];
  filesWritten: string[];
  filesChanged: string[];
  filesUpdated: string[];
  filesAdded: string[];
  filesDeleted: string[];
}


export interface BuildStats {
  compiler: {
    name: string;
    version: string;
  };
  bundles: BuildBundle[];
  entries: BuildComponent[][];
}


export interface BuildBundle {
  components: string[];
  outputFiles: {
    filePath: string;
  }[];
  inputFiles: {
    filePath: string;
  }[];
  modes?: string[];
}


export interface BuildComponent {
  tag: string;
  dependencyOf: string[];
}


export interface BuildConditionals {
  coreId?: 'core' | 'core.pf';
  polyfills?: boolean;
  verboseError: boolean;
  es5?: boolean;
  cssVarShim?: boolean;
  clientSide?: boolean;

  // ssr
  ssrServerSide: boolean;

  // encapsulation
  styles: boolean;

  // dom
  shadowDom: boolean;

  // vdom
  hostData: boolean;
  hostTheme: boolean;

  // decorators
  element: boolean;
  event: boolean;
  listener: boolean;
  method: boolean;
  propConnect: boolean;
  propContext: boolean;
  watchCallback: boolean;

  // lifecycle events
  cmpDidLoad: boolean;
  cmpWillLoad: boolean;
  cmpDidUpdate: boolean;
  cmpWillUpdate: boolean;
  cmpDidUnload: boolean;

  // attr
  observeAttr: boolean;

  // svg
  svg: boolean;
}


export interface FilesMap {
  [filePath: string]: string;
}


export type CompilerEventName = 'fileUpdate' | 'fileAdd' | 'fileDelete' | 'dirAdd' | 'dirDelete' | 'build' | 'rebuild';

export interface TranspileResults {
  code?: string;
  diagnostics?: d.Diagnostic[];
  cmpMeta?: d.ComponentMeta;
}


export type SourceTarget = 'es5' | 'es2015';
