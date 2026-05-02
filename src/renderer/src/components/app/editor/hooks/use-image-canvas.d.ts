interface DetectedFilter {
    type: string;
    intensity?: number;
}
export type ImageEffectType = DetectedFilter['type'];
export type ImageEffectOption = {
    type: ImageEffectType;
    labelKey: string;
    descriptionKey?: string;
};
export declare const IMAGE_EFFECT_OPTIONS: ImageEffectOption[];
export interface CropRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface CanvasDimensions {
    width: number;
    height: number;
}
export interface ImageCanvasState {
    rotation: number;
    cropRegion: CropRegion | null;
    dimensions: CanvasDimensions | null;
    isLoaded: boolean;
    hasError: boolean;
}
export interface UseImageCanvasReturn {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    state: ImageCanvasState;
    applyRotation: (direction: 'left' | 'right') => void;
    applyCrop: () => void;
    resetCrop: () => void;
    setCropRegion: (region: CropRegion | null) => void;
    applyResize: (width: number, height: number) => void;
    applyAI: (prompt: string) => void;
    applyEffect: (effect: ImageEffectType) => void;
    undo: () => void;
    canUndo: boolean;
    exportDataUri: () => string | null;
}
export declare function useImageCanvas(src: string): UseImageCanvasReturn;
export {};
