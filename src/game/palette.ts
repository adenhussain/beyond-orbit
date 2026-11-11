import { bridge } from './bridge';

/**
 * In-world colours that carry meaning (good / alert). In colour-blind mode
 * green becomes blue and red becomes magenta, matching the interface.
 */
export function worldPalette() {
  const cb = bridge.state.colorBlind;
  return {
    goodCss: cb ? '#4cc3ff' : '#5dfc9a',
    alertCss: cb ? '#ff5fd2' : '#ff4f4f',
    alert: cb ? 0xff5fd2 : 0xff2a2a,
  };
}
