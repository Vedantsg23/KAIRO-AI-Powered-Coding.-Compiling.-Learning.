/**
 * React declarations for the editor's checking of React (JSX) files: hooks,
 * createElement, context and JSX elements. Kept small on purpose (loaded
 * only when a React file is opened); the preview runs the real React 18.
 */
export const REACT_LITE = `
declare namespace React {
  type ReactNode = any;
  type ReactElement = any;
  type Key = string | number;
  type SetStateAction<S> = S | ((previous: S) => S);
  type Dispatch<A> = (value: A) => void;
  interface MutableRefObject<T> { current: T }
  interface RefObject<T> { readonly current: T | null }
  interface Context<T> { Provider: any; Consumer: any; displayName?: string }
  interface CSSProperties { [property: string]: string | number | undefined }
  type FC<P = {}> = (props: P & { children?: ReactNode }) => ReactNode;
  type FormEvent<T = any> = any;
  type ChangeEvent<T = any> = any;
  type MouseEvent<T = any> = any;
  type KeyboardEvent<T = any> = any;
  function createElement(type: any, props?: any, ...children: any[]): ReactElement;
  function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
  function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  function useLayoutEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
  function useRef<T>(initial: T): MutableRefObject<T>;
  function useRef<T = undefined>(): MutableRefObject<T | undefined>;
  function useReducer<S, A>(reducer: (state: S, action: A) => S, initial: S): [S, Dispatch<A>];
  function useContext<T>(context: Context<T>): T;
  function createContext<T>(defaultValue: T): Context<T>;
  function useId(): string;
  function memo<T>(component: T): T;
  function forwardRef<T = any, P = {}>(render: (props: P, ref: any) => ReactNode): FC<P>;
  function lazy<T>(factory: () => Promise<{ default: T }>): T;
  const Fragment: any;
  const StrictMode: any;
  const Suspense: any;
}
declare module "react" {
  export = React;
}
declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}
declare module "react-dom/client" {
  export function createRoot(container: any): { render(node: any): void; unmount(): void };
}
declare module "react-dom" {
  export function createRoot(container: any): { render(node: any): void; unmount(): void };
  export function render(node: any, container: any): void;
}
declare namespace JSX {
  type Element = any;
  interface IntrinsicElements {
    [elementName: string]: any;
  }
  interface ElementChildrenAttribute {
    children: {};
  }
}
`;
