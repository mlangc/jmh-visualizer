export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Recharts wraps a tick label onto multiple lines when it doesn't fit the axis's
// available width, splitting only at existing spaces and rendering each line as its
// own <tspan> with no separator between lines. A locator's text-content match then
// sees those spaces collapsed or shifted depending on exactly where the wrap landed,
// which is sensitive to layout (e.g. Bootstrap's grid gutter width) rather than to
// the label's actual content. Matching with `\s*` in place of each literal space
// accepts the label whether it renders on one line or wraps at any of its spaces.
export function wrapAgnostic(s: string): RegExp {
  return new RegExp(`^${escapeRegExp(s).replace(/ /g, '\\s*')}$`);
}
