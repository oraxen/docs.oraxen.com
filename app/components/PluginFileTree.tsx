/*
<PluginFileTree initialTreeData={[ { id: "assets", name: "assets", children: [ { id: "minecraft", name: "minecraft", hoverText: "This is a namespace.", children: [ { id: "models", name: "models", children: [ { id: "myitems", name: "myitems", children: [ { id: "mycoolmodel.json", name: "mycoolmodel.json", isLeaf: true, }, { id: "mycoolmodel2.json", name: "mycoolmodel2.json", isLeaf: true, } ] }, { id: "blocks", name: "blocks", children: [ { id: "acacia_button.json", name: "acacia_button.json", isLeaf: true, }, { id: "oraxenore.json", name: "oraxenore.json", isLeaf: true, } ] }, ] } ] } ] } ]} />
*/

'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Tree, NodeApi, TreeApi, NodeRendererProps } from 'react-arborist';
import {
  FaFolder,
  FaFolderOpen,
  FaFile,
  FaChevronRight,
  FaChevronDown,
  FaQuestionCircle,
} from 'react-icons/fa';
import ReactDOM from 'react-dom';

interface TreeNodeData {
  id: string;
  name: string;
  children?: TreeNodeData[];
  hoverText?: string;
}

interface NodeProps extends NodeRendererProps<TreeNodeData> {
  currentTheme: string | null;
  mounted: boolean;
}

interface PluginFileTreeProps {
  initialTreeData: TreeNodeData[];
}
const Node = React.memo(function Node({ node, style, dragHandle, currentTheme, mounted }: NodeProps) {
  const Icon = node.isLeaf ? FaFile : node.isOpen ? FaFolderOpen : FaFolder;
  const ArrowIcon = node.isInternal ? (node.isOpen ? FaChevronDown : FaChevronRight) : null;

  const [showCard, setShowCard] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const questionIconRef = useRef<HTMLButtonElement>(null);
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0 });

  const handleQuestionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowCard(prev => !prev);
  };

  const calculateCardPosition = useCallback(() => {
    if (questionIconRef.current && showCard) {
      const iconRect = questionIconRef.current.getBoundingClientRect();
      const cardWidth = 300;
      const cardHeight = cardRef.current?.offsetHeight || 150; // more conservative fallback
      const margin = 8;

      let top = iconRect.top;
      let left = iconRect.right + margin;

      if (top + cardHeight > window.innerHeight) {
        top = window.innerHeight - cardHeight - margin;
      }
      if (top < 0) {
        top = margin;
      }

      if (left + cardWidth > window.innerWidth) {
        left = iconRect.left - cardWidth - margin;
      }

      if (left < 0) {
        left = 0;
      }

      setCardPosition({ top, left });
    }
  }, [showCard]);

  // Recalculate after card renders to account for actual height
  useLayoutEffect(() => {
    if (showCard) {
      calculateCardPosition();
    }
  }, [showCard, calculateCardPosition, node.data.hoverText]);

  useEffect(() => {
    const handleResize = () => calculateCardPosition();
    if (showCard) {
      handleResize();
      window.addEventListener('resize', handleResize);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [showCard, calculateCardPosition]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      if (cardRef.current && !cardRef.current.contains(event.target) &&
          questionIconRef.current && !questionIconRef.current.contains(event.target)) {
        setShowCard(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isDark = mounted && currentTheme === 'dark';
  
  const textColor = isDark ? '#e5e7eb' : '#1f2937';
  const arrowColor = isDark ? '#9ca3af' : '#6b7280';
  const folderColor = isDark ? '#fbbf24' : '#f59e0b';
  const fileColor = isDark ? '#9ca3af' : '#6b7280';
  const questionIconColor = isDark ? '#6b7280' : '#9ca3af';

  const cardBgColor = isDark ? '#1f2937' : '#ffffff';
  const cardBorderColor = isDark ? '#374151' : '#e5e7eb';
  const cardShadow = isDark ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.08)';

  const handleNodeKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && node.isInternal) {
      if (e.key === ' ') e.preventDefault();
      node.toggle();
    }
  };

  return (
    <div
      ref={dragHandle}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        cursor: node.isInternal ? 'pointer' : 'default',
        position: 'relative',
        color: textColor,
        paddingTop: 0,
        paddingBottom: 0,
      }}
      className="node-container"
      role="treeitem"
      aria-expanded={node.isInternal ? node.isOpen : undefined}
      tabIndex={0}
      onKeyDown={handleNodeKeyDown}
      onClick={(e: React.MouseEvent) => {
        if (questionIconRef.current?.contains(e.target as HTMLElement)) {
          return;
        }
        node.isInternal && node.toggle();
      }}
    >
      {/* Arrow icon container */}
      <div style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {ArrowIcon && <ArrowIcon style={{ fontSize: '0.75em', color: arrowColor }} />}
      </div>
      <div style={{ marginLeft: '4px', marginRight: '8px', display: 'flex', alignItems: 'center' }}>
        <Icon color={node.isLeaf ? fileColor : folderColor} />
      </div>
      <span style={{
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        flexShrink: 1,
        minWidth: 0
      }}>
        {node.data.name}
      </span>

      {node.data.hoverText && (
        <>
          <button
            type="button"
            ref={questionIconRef}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 1,
              marginLeft: '8px',
              marginRight: '8px',
              flexShrink: 0,
              background: 'none',
              border: 'none',
              padding: 0,
            }}
            aria-label={`More info about ${node.data.name}`}
            aria-describedby={`card-${node.id}`}
            aria-expanded={showCard}
            onClick={handleQuestionClick}
          >
            <FaQuestionCircle style={{ fontSize: '0.8em', color: questionIconColor }} />
          </button>

          {showCard && ReactDOM.createPortal(
            <div
              ref={cardRef}
              id={`card-${node.id}`}
              role="tooltip"
              aria-hidden={!showCard}
              style={{
                position: 'fixed',
                top: cardPosition.top,
                left: cardPosition.left,
                width: '300px',
                padding: '12px',
                backgroundColor: cardBgColor,
                border: `1px solid ${cardBorderColor}`,
                borderRadius: '8px',
                boxShadow: cardShadow,
                zIndex: 1000,
                fontSize: '0.9em',
                color: textColor,
                lineHeight: '1.5',
              }}
            >
              {node.data.hoverText}
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
});
export default function PluginFileTree({ initialTreeData }: PluginFileTreeProps) {
  const treeApiRef = useRef<TreeApi<TreeNodeData> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(720);
  const PADDING = 16;
  const PADDING_VERTICAL = 12;

  const [currentTheme, setCurrentTheme] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const getTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                     document.documentElement.style.colorScheme === 'dark' ||
                     document.documentElement.getAttribute('data-theme') === 'dark';
      return isDark ? 'dark' : 'light';
    };
    
    const theme = getTheme();
    setCurrentTheme(theme);

    const observer = new MutationObserver(() => {
      const theme = getTheme();
      setCurrentTheme(theme);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });

    return () => observer.disconnect();
  }, []);

  const [containerStyle, setContainerStyle] = useState({ height: 200 });

  const MAX_WIDTH_RATIO = 0.5;
  const MAX_WIDTH_PX = 720;

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const newWidth = Math.min(window.innerWidth * MAX_WIDTH_RATIO, MAX_WIDTH_PX);
        setContainerWidth(newWidth);
      }
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const updateLayout = useCallback(() => {
    if (!treeApiRef.current) return;

    const ROW_HEIGHT = 32;
    const MIN_HEIGHT = 32;
    const MAX_HEIGHT = 500;

    const visibleNodesCount = treeApiRef.current.visibleNodes.length;
    const nodesHeight = visibleNodesCount * ROW_HEIGHT;
    let totalHeight = nodesHeight + (PADDING_VERTICAL * 2);
    totalHeight = Math.min(Math.max(totalHeight, MIN_HEIGHT), MAX_HEIGHT);

    setContainerStyle((prevStyle) => ({
      ...prevStyle,
      height: totalHeight,
    }));
  }, []);

  useLayoutEffect(() => {
    updateLayout();
  }, [containerWidth, updateLayout]);

  const containerBgColor = mounted && currentTheme === 'dark' ? '#0f172a' : '#ffffff';

  return (
    <div
      ref={containerRef}
      suppressHydrationWarning
      style={{
        boxSizing: 'border-box',
        width: `${containerWidth}px`,
        borderRadius: '12px',
        padding: `${PADDING_VERTICAL}px ${PADDING}px`,
        overflow: 'hidden',
        transition: 'background-color 0.3s ease',
        height: `${containerStyle.height}px`,
        backgroundColor: containerBgColor,
      }}
    >
      <Tree
        ref={treeApiRef}
        initialData={initialTreeData}
        indent={28}
        rowHeight={32}
        width={containerWidth - (PADDING * 2)}
        className="file-tree"
        onToggle={() => requestAnimationFrame(updateLayout)}
        openByDefault={false}
      >
        {(nodeProps) => <Node {...nodeProps} currentTheme={currentTheme} mounted={mounted} />}
      </Tree>
    </div>
  );
}
