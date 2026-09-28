import React, {useId} from 'react';

export default function Tooltip({children, text, trigger}) {
  const tooltipId = useId();
  const hasRichContent = trigger !== undefined;
  const Root = hasRichContent ? 'div' : 'span';
  const Content = hasRichContent ? 'div' : 'span';

  return (
    <Root className="oraxen-tooltip" tabIndex={0} aria-describedby={tooltipId}>
      <span className="oraxen-tooltip__trigger">{hasRichContent ? trigger : children}</span>
      <Content className="oraxen-tooltip__content" id={tooltipId} role="tooltip">
        {hasRichContent ? children : text}
      </Content>
    </Root>
  );
}
