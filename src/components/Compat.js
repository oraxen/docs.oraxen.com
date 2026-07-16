import React, {Children, cloneElement, isValidElement} from 'react';
import Admonition from '@theme/Admonition';
import ThemeDetails from '@theme/Details';

export function Callout({children, type = 'info'}) {
  const types = {important: 'danger', warning: 'warning', tip: 'tip', note: 'note', info: 'info'};
  return <Admonition type={types[type] || 'info'}>{children}</Admonition>;
}

export function Details({children}) {
  const items = Children.toArray(children);
  const summary = items.find((child) => isValidElement(child) && child.type === 'summary');
  return (
    <ThemeDetails className="oraxen-details" summary={summary}>
      {items.filter((child) => child !== summary)}
    </ThemeDetails>
  );
}

export function Steps({children}) {
  return <div className="oraxen-steps">{children}</div>;
}

function Tab({children, label}) {
  return <section className="oraxen-tab" data-label={label}>{children}</section>;
}

export function Tabs({children, items = []}) {
  return (
    <div className="oraxen-tabs">
      {Children.map(children, (child, index) =>
        isValidElement(child) ? cloneElement(child, {label: items[index]}) : child,
      )}
    </div>
  );
}
Tabs.Tab = Tab;

// Kept for source-compatible imports. Markdown tables remain native MDX tables.
export function Table({children}) {
  return <table>{children}</table>;
}

export {Tab};
