import type { ReactNode } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';

interface HorizontalSplitProps {
  left: ReactNode;
  right: ReactNode;
  leftDefaultSize?: string;
  leftMinSize?: string;
  leftMaxSize?: string;
  rightMinSize?: string;
  className?: string;
}

export function HorizontalSplit({
  left,
  right,
  leftDefaultSize = '42%',
  leftMinSize = '25%',
  leftMaxSize = '75%',
  rightMinSize = '25%',
  className = '',
}: HorizontalSplitProps) {
  return (
    <Group orientation="horizontal" id="ux-h-group" className={`h-full w-full ${className}`}>
      <Panel
        defaultSize={leftDefaultSize}
        minSize={leftMinSize}
        maxSize={leftMaxSize}
        id="ux-left-panel"
        className="flex flex-col overflow-hidden bg-white"
      >
        {left}
      </Panel>

      <Separator className="w-[12px] bg-[#e2e8ee] hover:bg-[#03ef62]/20 active:bg-[#03ef62]/40 transition-colors cursor-col-resize flex items-center justify-center group relative z-20 select-none border-x border-[#d0dbe5]">
        <div className="w-[3px] h-[36px] bg-[#93a3b4] group-hover:bg-[#03ef62] group-active:bg-[#03ef62] rounded-full transition-colors shadow-sm" />
      </Separator>

      <Panel
        defaultSize="auto"
        minSize={rightMinSize}
        id="ux-right-panel"
        className="flex flex-col overflow-hidden bg-[#05192d]"
      >
        {right}
      </Panel>
    </Group>
  );
}

interface VerticalSplitProps {
  top: ReactNode;
  bottom: ReactNode;
  topDefaultSize?: string;
  topMinSize?: string;
  topMaxSize?: string;
  bottomMinSize?: string;
  className?: string;
}

export function VerticalSplit({
  top,
  bottom,
  topDefaultSize = '56%',
  topMinSize = '20%',
  topMaxSize = '80%',
  bottomMinSize = '15%',
  className = '',
}: VerticalSplitProps) {
  return (
    <Group orientation="vertical" id="ux-v-group" className={`h-full w-full ${className}`}>
      <Panel
        defaultSize={topDefaultSize}
        minSize={topMinSize}
        maxSize={topMaxSize}
        id="ux-top-panel"
        className="flex flex-col overflow-hidden bg-[#05192d]"
      >
        {top}
      </Panel>

      <Separator className="h-[10px] bg-[#0b2338] hover:bg-[#03ef62]/20 active:bg-[#03ef62]/40 transition-colors cursor-row-resize flex items-center justify-center group relative z-20 select-none border-y border-[#1d3952]">
        <div className="h-[3px] w-[36px] bg-[#5b6b7b] group-hover:bg-[#03ef62] group-active:bg-[#03ef62] rounded-full transition-colors shadow-sm" />
      </Separator>

      <Panel
        defaultSize="auto"
        minSize={bottomMinSize}
        id="ux-bottom-panel"
        className="flex flex-col overflow-hidden bg-[#05192d]"
      >
        {bottom}
      </Panel>
    </Group>
  );
}
