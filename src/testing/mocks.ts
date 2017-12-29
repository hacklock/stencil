import { BuildConfig, ComponentMeta, Diagnostic, DomApi, HostContentNodes, HostElement,
  HydrateOptions, Logger, PlatformApi, RendererApi, StencilSystem, VNode } from '../util/interfaces';
import { createDomApi } from '../core/renderer/dom-api';
import { createPlatformServer } from '../server/platform-server';
import { createRendererPatch } from '../core/renderer/patch';
import { initHostElementConstructor } from '../core/instance/init-host';
import { initComponentInstance } from '../core/instance/init-component';
import { noop } from '../util/helpers';
import { validateBuildConfig } from '../util/validate-config';
import { ComponentInstance } from '../util/interfaces';


export function mockPlatform(win?: any, domApi?: DomApi) {
  const diagnostics: Diagnostic[] = [];
  const config = mockBuildConfig();
  win = win || config.sys.createDom().parse({html: ''});
  domApi = domApi || createDomApi(win, win.document);

  const plt = createPlatformServer(
    config,
    win,
    win.document,
    domApi,
    diagnostics,
    false,
    null
  );
  plt.isClient = true;

  const $mockedQueue = plt.queue = mockQueue();
  const $loadBundleQueue = mockQueue();

  plt.loadBundle = function(_: any, _modeName: string, cb: Function) {
    $loadBundleQueue.add(cb);
  };

  (<MockedPlatform>plt).$flushQueue = function() {
    return new Promise(resolve => {
      $mockedQueue.flush(resolve);
    });
  };

  (<MockedPlatform>plt).$flushLoadBundle = function() {
    return new Promise(resolve => {
      $loadBundleQueue.flush(resolve);
    });
  };

  const renderer = createRendererPatch(plt, domApi);

  plt.render = function(oldVNode: VNode, newVNode: VNode, isUpdate: boolean, hostElementContentNode?: HostContentNodes) {
    return renderer(oldVNode, newVNode, isUpdate, hostElementContentNode);
  };

  return (<MockedPlatform>plt);
}


export interface MockedPlatform extends PlatformApi {
  $flushQueue?: () => Promise<any>;
  $flushLoadBundle?: () => Promise<any>;
}


export function mockBuildConfig() {
  var sys = mockStencilSystem();

  const config: BuildConfig = {
    sys: sys,
    logger: mockLogger(),
    rootDir: '/',
    suppressTypeScriptErrors: true,
    devMode: true
  };

  return validateBuildConfig(config);
}


export function mockStencilSystem() {
  const sys: StencilSystem = {

    compiler: {
      name: 'test',
      version: 'test',
      typescriptVersion: 'test'
    },

    copy: function mockCopyDir(src: string, dest: string) {
      src; dest;
      return new Promise(resolve => {
        resolve();
      });
    },

    createDom: mockCreateDom,

    emptyDir: function() {
      return new Promise(resolve => {
        resolve();
      });
    },

    ensureDir: function() {
      return new Promise(resolve => {
        resolve();
      });
    },

    generateContentHash: function mockGenerateContentHash(content: string, length: number) {
      var crypto = require('crypto');
      return crypto.createHash('sha1')
                  .update(content)
                  .digest('base64')
                  .replace(/\W/g, '')
                  .substr(0, length)
                  .toLowerCase();
    },

    getClientCoreFile: mockGetClientCoreFile,

    fs: null,

    isGlob: function(str) {
      const isGlob = require('is-glob');
      return isGlob(str);
    },

    minifyCss: mockMinify,

    minifyJs: mockMinify,

    minimatch(filePath, pattern, opts) {
      const minimatch = require('minimatch');
      return minimatch(filePath, pattern, opts);
    },

    path: require('path'),

    remove: function mockRmDir(path) {
      path;
      return new Promise(resolve => {
        resolve();
      });
    },

    rollup: rollup,

    sass: {
      render: function(config: any, cb: Function) {
        Promise.resolve().then(() => {
          config;

          let content: string;
          if (sys.fs) {
            content = sys.fs.readFileSync(config.file, 'utf-8');
          } else {
            content = `/** ${config.file} mock css **/`;
          }

          cb(null, {
            css: content,
            stats: []
          });
        });
      }
    },

    semver: require('semver'),

    typescript: require('typescript'),

    url: require('url'),

    vm: {
      createContext: function(ctx, wwwDir, sandbox) {
        ctx; wwwDir;
        return require('vm').createContext(sandbox);
      },
      runInContext: function(code, contextifiedSandbox, options) {
        require('vm').runInContext(code, contextifiedSandbox, options);
      }
    },

    watch: mockWatch
  };

  return sys;
}


function mockGetClientCoreFile(opts: {staticName: string}) {
  return Promise.resolve(`
    (function (window, document, apptNamespace, appFileName, appCore, appCorePolyfilled, components) {
        // mock getClientCoreFile, staticName: ${opts.staticName}
    })(window, document, '__APP__');`);
}


function mockWatch(paths: string): any {
  paths;
  const events: {[eventName: string]: Function} = {};

  const watcher = {
    on: function(eventName: string, listener: Function) {
      events[eventName] = listener;
      return watcher;
    },
    $triggerEvent: function(eventName: string, path: string) {
      events[eventName](path);
    }
  };

  return watcher;
}

function mockCreateDom() {
  const jsdom = require('jsdom');
  let dom: any;

  return {
    parse: function(opts: HydrateOptions) {
      dom = new jsdom.JSDOM(opts.html, {
        url: opts.url,
        referrer: opts.referrer,
        userAgent: opts.userAgent,
      });
      return dom.window;
    },
    serialize: function() {
      return dom.serialize();
    },
    destroy: function() {
      dom.window.close();
      dom = null;
    },
    getDiagnostics: function(): any {
      return [];
    }
  };
}

function mockMinify(input: string) {
  return <any>{
    output: `/** mock minify **/\n${input}`,
    diagnostics: []
  };
}

var rollup = require('rollup');
rollup.plugins = {
  commonjs: require('rollup-plugin-commonjs'),
  nodeResolve: require('rollup-plugin-node-resolve')
};


export function mockFs() {
  const MemoryFileSystem = require('memory-fs');
  const fs = new MemoryFileSystem();

  const orgreadFileSync = fs.readFileSync;
  const orgwriteFileSync = fs.writeFileSync;

  fs.readFileSync = function() {
    try {
      return orgreadFileSync.apply(fs, arguments);
    } catch (e) {
      if (e.message && e.message.indexOf('invalid argument') > -1) {
        console.log('mockFs, fs.readFileSync', arguments);
        console.trace(e);
      } else if (e.message && e.message.indexOf('no such file') > -1 && e.path.indexOf('node_modules') === -1) {
        console.log('mockFs, fs.readFileSync', arguments);
        console.trace(e);
      } else {
        throw e;
      }
    }
  };

  fs.writeFileSync = function() {
    return orgwriteFileSync.apply(fs, arguments);
  };

  return fs;
}


export function mockLogger() {
  const logger: Logger = {
    level: 'info',
    debug: noop,
    info: noop,
    error: noop,
    warn: noop,
    createTimeSpan: (startMsg: string, debug?: boolean) => {
      return {
        finish: () => {
          startMsg; debug;
        }
      };
    },
    printDiagnostics: noop,
    red: (msg) => msg,
    green: (msg) => msg,
    yellow: (msg) => msg,
    blue: (msg) => msg,
    magenta: (msg) => msg,
    cyan: (msg) => msg,
    gray: (msg) => msg,
    bold: (msg) => msg,
    dim: (msg) => msg
  };
  return logger;
}


export function mockWindow(opts: HydrateOptions = {}) {
  opts.userAgent = opts.userAgent || 'test';

  const window = mockStencilSystem().createDom().parse(opts);

  (window as any).requestAnimationFrame = function(callback: Function) {
    setTimeout(() => {
      callback(Date.now());
    });
  };

  return window;
}


export function mockDocument(window?: Window) {
  return (window || mockWindow()).document;
}


export function mockDomApi(win?: any, doc?: any) {
  win = win || mockWindow();
  doc = doc || win.document;
  return createDomApi(win, doc);
}


export function mockRenderer(plt?: MockedPlatform, domApi?: DomApi): RendererApi {
  plt = plt || mockPlatform();
  return createRendererPatch(<PlatformApi>plt, domApi || mockDomApi());
}


export function mockQueue() {
  const callbacks: Function[] = [];

  function flush(cb?: Function) {
    setTimeout(() => {
      while (callbacks.length > 0) {
        callbacks.shift()();
      }
      cb();
    }, Math.round(Math.random() * 20));
  }

  function add(cb: Function) {
    callbacks.push(cb);
  }

  function clear() {
    callbacks.length = 0;
  }

  return {
    add: add,
    flush: flush,
    clear: clear
  };
}


export function mockHtml(html: string): Element {
  const jsdom = require('jsdom');
  return jsdom.JSDOM.fragment(html.trim()).firstChild;
}

export function mockSVGElement(): Element {
  const jsdom = require('jsdom');
  return jsdom.JSDOM.fragment(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`).firstChild;
}

export function mockElement(tag: string = 'div'): Element {
  const jsdom = require('jsdom');
  return jsdom.JSDOM.fragment(`<${tag}></${tag}>`).firstChild;
}

export function mockComponentInstance(plt: PlatformApi, domApi: DomApi, cmpMeta: ComponentMeta = {}): ComponentInstance {
  mockDefine(plt, cmpMeta);

  const el = domApi.$createElement('ion-cmp') as any;
  initComponentInstance(plt, el);
  return el._instance;
}

export function mockTextNode(text: string): Element {
  const jsdom = require('jsdom');
  return jsdom.JSDOM.fragment(text).firstChild;
}


export function mockDefine(plt: MockedPlatform, cmpMeta: ComponentMeta) {
  if (!cmpMeta.tagNameMeta) {
    cmpMeta.tagNameMeta = 'ion-cmp';
  }
  if (!cmpMeta.componentConstructor) {
    cmpMeta.componentConstructor = class {} as any;

  }
  if (!cmpMeta.membersMeta) {
    cmpMeta.membersMeta = {};
  }

  (<PlatformApi>plt).defineComponent(cmpMeta);

  return cmpMeta;
}

export function mockEvent(domApi: DomApi, name: string, detail: any = {}): CustomEvent {
  const evt = (domApi.$documentElement.parentNode as Document).createEvent('CustomEvent');
  evt.initCustomEvent(name, false, false, detail);
  return evt;
}

export function mockDispatchEvent(domApi: DomApi, el: HTMLElement, name: string, detail: any = {}): boolean {
  const ev = mockEvent(domApi, name, detail);
  return el.dispatchEvent(ev);
}

export function mockConnect(plt: MockedPlatform, html: string) {
  const jsdom = require('jsdom');
  const rootNode = jsdom.JSDOM.fragment(html);

  connectComponents(plt, rootNode);

  return rootNode;
}


function connectComponents(plt: MockedPlatform, node: HostElement) {
  if (!node) return;

  if (node.tagName) {
    if (!node.$connected) {
      const cmpMeta = (<PlatformApi>plt).getComponentMeta(node);
      if (cmpMeta) {
        initHostElementConstructor((<PlatformApi>plt), cmpMeta, node);
        (<HostElement>node).connectedCallback();
      }
    }
  }
  if (node.childNodes) {
    for (var i = 0; i < node.childNodes.length; i++) {
      connectComponents(plt, <HostElement>node.childNodes[i]);
    }
  }
}


export function waitForLoad(plt: MockedPlatform, rootNode: any, tag: string): Promise<HostElement> {
  const elm: HostElement = rootNode.tagName === tag.toLowerCase() ? rootNode : rootNode.querySelector(tag);

  return plt.$flushQueue()
    // flush to read attribute mode on host elment
    .then(() => plt.$flushLoadBundle())
    // flush to load component mode data
    .then(() => plt.$flushQueue())
    .then(() => {
      // flush to do the update
      connectComponents(plt, elm);
      return elm;
    });
}


export function compareHtml(input: string) {
  return input.replace(/(\s*)/g, '')
              .replace(/<!---->/g, '')
              .toLowerCase()
              .trim();
}


export function removeWhitespaceFromNodes(node: Node): any {
  if (node.nodeType === 1) {
    for (var i = node.childNodes.length - 1; i >= 0; i--) {
      if (node.childNodes[i].nodeType === 3) {
        if (node.childNodes[i].nodeValue.trim() === '') {
          node.removeChild(node.childNodes[i]);
        } else {
          node.childNodes[i].nodeValue = node.childNodes[i].nodeValue.trim();
        }
      } else {
        removeWhitespaceFromNodes(node.childNodes[i]);
      }
    }
  }
  return node;
}
