/**
 * Node.js declarations for the editor's JavaScript/TypeScript checking: the
 * parts of Node that student programs use (reading standard input, process,
 * require, fs, readline, timers). The sandbox itself compiles TypeScript with
 * the full @types/node; this only keeps the editor from flagging valid Node
 * code while still catching typos such as "consol.log" or "proces.stdin".
 */
export const NODE_LITE = `
interface NodeReadable {
  on(event: "data", listener: (chunk: any) => void): this;
  on(event: "end" | "close", listener: () => void): this;
  on(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  setEncoding(encoding: string): this;
  resume(): this;
  read(size?: number): any;
  [Symbol.asyncIterator](): AsyncIterableIterator<any>;
  fd: number;
}
interface NodeWritable {
  write(chunk: any, callback?: (err?: any) => void): boolean;
  end(chunk?: any): void;
  columns?: number;
  isTTY?: boolean;
}
interface NodeProcess {
  argv: string[];
  env: Record<string, string | undefined>;
  stdin: NodeReadable;
  stdout: NodeWritable;
  stderr: NodeWritable;
  exit(code?: number): never;
  exitCode: number | undefined;
  cwd(): string;
  platform: string;
  version: string;
  pid: number;
  hrtime: { (time?: [number, number]): [number, number]; bigint(): bigint };
  memoryUsage(): { heapUsed: number; rss: number };
  nextTick(callback: (...args: any[]) => void, ...args: any[]): void;
  on(event: string, listener: (...args: any[]) => void): NodeProcess;
  uptime(): number;
}
declare var process: NodeProcess;
declare var global: typeof globalThis;
declare var __dirname: string;
declare var __filename: string;
declare var module: { exports: any; id: string; require(id: string): any };
declare var exports: any;
declare function require(id: string): any;
declare namespace require {
  function resolve(id: string): string;
}
declare class Buffer extends Uint8Array {
  static from(data: any, encoding?: string): Buffer;
  static alloc(size: number): Buffer;
  static concat(list: Uint8Array[]): Buffer;
  toString(encoding?: string, start?: number, end?: number): string;
}
declare function setImmediate(callback: (...args: any[]) => void, ...args: any[]): any;
declare function clearImmediate(handle: any): void;
declare function structuredClone<T>(value: T): T;

declare module "fs" {
  export function readFileSync(path: string | number, options?: any): any;
  export function writeFileSync(path: string | number, data: any, options?: any): void;
  export function appendFileSync(path: string, data: any): void;
  export function existsSync(path: string): boolean;
  export function readdirSync(path: string): string[];
  export function mkdirSync(path: string, options?: any): void;
  export function unlinkSync(path: string): void;
  export function readFile(path: string, ...args: any[]): void;
  export function writeFile(path: string, ...args: any[]): void;
  export const promises: any;
}
declare module "node:fs" {
  export * from "fs";
}
declare module "readline" {
  export interface Interface {
    on(event: "line", listener: (line: string) => void): this;
    on(event: "close", listener: () => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    question(query: string, callback: (answer: string) => void): void;
    close(): void;
    prompt(): void;
    setPrompt(prompt: string): void;
    [Symbol.asyncIterator](): AsyncIterableIterator<string>;
  }
  export function createInterface(options: any): Interface;
}
declare module "node:readline" {
  export * from "readline";
}
declare module "os" {
  export const EOL: string;
  export function cpus(): any[];
  export function platform(): string;
  export function homedir(): string;
}
declare module "path" {
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
  export function basename(path: string, ext?: string): string;
  export function dirname(path: string): string;
  export function extname(path: string): string;
  export const sep: string;
}
declare module "util" {
  export function inspect(value: any, options?: any): string;
  export function format(format: any, ...args: any[]): string;
  export function promisify(fn: any): any;
}
declare module "events" {
  export class EventEmitter {
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): boolean;
    off(event: string, listener: (...args: any[]) => void): this;
  }
  export default EventEmitter;
}
declare module "assert" {
  function assert(value: any, message?: string): asserts value;
  namespace assert {
    function strictEqual(actual: any, expected: any, message?: string): void;
    function deepStrictEqual(actual: any, expected: any, message?: string): void;
    function ok(value: any, message?: string): asserts value;
  }
  export = assert;
}
declare module "crypto" {
  export function randomUUID(): string;
  export function randomInt(min: number, max?: number): number;
  export function createHash(algorithm: string): any;
}
declare module "child_process" {
  export function execSync(command: string, options?: any): any;
  export function spawn(command: string, args?: string[], options?: any): any;
}
`;
