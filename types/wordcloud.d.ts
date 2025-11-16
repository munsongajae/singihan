declare module 'wordcloud' {
  interface WordCloudOptions {
    list?: Array<[string, number]>;
    gridSize?: number;
    weightFactor?: number | ((size: number) => number);
    fontFamily?: string;
    color?: string | (() => string);
    rotateRatio?: number;
    rotationSteps?: number;
    backgroundColor?: string;
    drawOutOfBound?: boolean;
    shrinkToFit?: boolean;
    minSize?: number;
    ellipticity?: number;
    drawMask?: boolean;
  }

  function wordcloud(
    canvas: HTMLCanvasElement,
    options: WordCloudOptions
  ): void;

  export default wordcloud;
}

