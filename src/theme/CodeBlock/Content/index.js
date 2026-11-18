import React, {useEffect, useRef} from 'react';
import {useCodeBlockContext} from '@docusaurus/theme-common/internal';
import CodeBlockContent from '@theme-original/CodeBlock/Content';

export default function TooltipAwareCodeBlockContent(props) {
  const {wordWrap} = useCodeBlockContext();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (wordWrap.codeBlockRef.current?.closest('.oraxen-tooltip__content') && !wordWrap.isEnabled) {
      wordWrap.toggle();
    }
  }, [wordWrap]);

  return <CodeBlockContent {...props} />;
}
