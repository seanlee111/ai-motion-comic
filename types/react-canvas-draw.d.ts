declare module 'react-canvas-draw' {
  export interface CanvasDrawProps {
    onChange?: ((canvas: any) => void) | null;
    loadTimeOffset?: number;
    lazyRadius?: number;
    brushRadius?: number;
    brushColor?: string;
    catenaryColor?: string;
    gridColor?: string;
    backgroundColor?: string;
    hideGrid?: boolean;
    canvasWidth?: number | string;
    canvasHeight?: number | string;
    disabled?: boolean;
    imgSrc?: string;
    saveData?: string;
    immediateLoading?: boolean;
    hideInterface?: boolean;
    className?: string;
    style?: React.CSSProperties;
    ref?: React.RefObject<any>;
  }

  export default class CanvasDraw extends React.Component<CanvasDrawProps> {
    undo(): void;
    clear(): void;
    getSaveData(): string;
    loadSaveData(saveData: string, immediate?: boolean): void;
    getDataURL(fileType: string, useBgImage: boolean, background: string): string;
  }
}
