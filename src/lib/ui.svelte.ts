// UI-Zustand: Toast, Bottom-Sheet-Picker, Haptik.
import type { Component } from 'svelte';

export const toastState = $state<{ msg: string; action?: { label: string; run: () => void }; id: number }>({ msg: '', id: 0 });
let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string, action?: { label: string; run: () => void }): void {
  clearTimeout(toastTimer);
  toastState.msg = msg; toastState.action = action; toastState.id++;
  toastTimer = setTimeout(() => { toastState.msg = ''; }, action ? 6000 : 3200);
}
export function hideToast(): void { toastState.msg = ''; }

export function buzz(p: number | number[] = 12): void { try { navigator.vibrate?.(p); } catch { /* egal */ } }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProps = Record<string, any>;
export const picker = $state<{ component: Component<AnyProps> | null; props: AnyProps }>({ component: null, props: {} });
let returnFocus: HTMLElement | null = null;
export function openPicker<P extends AnyProps>(component: Component<P>, props: P = {} as P): void {
  if (!picker.component) returnFocus = document.activeElement as HTMLElement | null;
  picker.component = component as unknown as Component<AnyProps>;
  picker.props = props;
}
export function closePicker(): void {
  if (!picker.component) return;
  picker.component = null; picker.props = {};
  returnFocus?.focus?.();
}
