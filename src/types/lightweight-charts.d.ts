declare module 'lightweight-charts' {
  export type Time = number | string | BusinessDay;

  export interface BusinessDay {
    year: number;
    month: number;
    day: number;
  }

  export interface Point {
    x: number;
    y: number;
  }

  export interface MouseEventParams {
    time?: Time;
    point?: Point;
    seriesData: Map<string, any>;
    hoveredSeries?: any;
    sourceEvent: MouseEvent | TouchEvent;
  }

  export interface ChartOptions {
    width?: number;
    height?: number;
    layout?: LayoutOptions;
    crosshair?: CrosshairOptions;
    grid?: GridOptions;
    rightPriceScale?: PriceScaleOptions;
    leftPriceScale?: PriceScaleOptions;
    timeScale?: TimeScaleOptions;
    watermark?: WatermarkOptions;
    localization?: LocalizationOptions;
    handleScroll?: HandleScrollOptions;
    handleScale?: HandleScaleOptions;
  }

  export interface LayoutOptions {
    backgroundColor: string | { type: 'solid' | 'gradient'; color: string };
    textColor: string;
    fontSize?: number;
    fontFamily?: string;
  }

  export interface CrosshairOptions {
    mode: CrosshairMode;
    vertLine?: VertLineOptions;
    horzLine?: HorzLineOptions;
  }

  export interface VertLineOptions {
    width: number;
    color: string;
    style: LineStyle;
    visible?: boolean;
    labelVisible?: boolean;
    labelBackgroundColor?: string;
  }

  export interface HorzLineOptions {
    width: number;
    color: string;
    style: LineStyle;
    visible?: boolean;
    labelVisible?: boolean;
    labelBackgroundColor?: string;
  }

  export interface GridOptions {
    vertLines: GridLineOptions;
    horzLines: GridLineOptions;
  }

  export interface GridLineOptions {
    color: string;
    style: LineStyle;
    visible?: boolean;
  }

  export interface PriceScaleOptions {
    autoScale?: boolean;
    mode?: PriceScaleMode;
    invertScale?: boolean;
    alignLabels?: boolean;
    borderVisible?: boolean;
    borderColor?: string;
    entireTextOnly?: boolean;
    visible?: boolean;
    ticksVisible?: boolean;
    scaleMargins?: { top: number; bottom: number };
  }

  export interface TimeScaleOptions {
    rightOffset?: number;
    barSpacing?: number;
    minBarSpacing?: number;
    fixLeftEdge?: boolean;
    fixRightEdge?: boolean;
    lockVisibleTimeRangeOnResize?: boolean;
    rightBarStaysOnScroll?: boolean;
    borderVisible?: boolean;
    borderColor?: string;
    visible?: boolean;
    timeVisible?: boolean;
    secondsVisible?: boolean;
  }

  export interface WatermarkOptions {
    color?: string;
    visible?: boolean;
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontStyle?: string;
    fontWeight?: string;
  }

  export interface LocalizationOptions {
    locale?: string;
    dateFormat?: string;
  }

  export interface HandleScrollOptions {
    pressedMouseMove?: boolean;
    horzTouchDrag?: boolean;
    vertTouchDrag?: boolean;
    mouseWheel?: boolean;
  }

  export interface HandleScaleOptions {
    axisPressedMouseMove?: boolean;
    axisDoubleClickReset?: boolean;
    mouseWheel?: boolean;
    pinch?: boolean;
  }

  export interface IChartApi {
    applyOptions(options: ChartOptions): void;
    options(): ChartOptions;
    remove(): void;
    resize(width: number, height: number): void;
    addCandlestickSeries(options?: CandlestickSeriesOptions): ISeriesApi<'Candlestick'>;
    addLineSeries(options?: LineSeriesOptions): ISeriesApi<'Line'>;
    addHistogramSeries(options?: HistogramSeriesOptions): ISeriesApi<'Histogram'>;
    addAreaSeries(options?: AreaSeriesOptions): ISeriesApi<'Area'>;
    addBarSeries(options?: BarSeriesOptions): ISeriesApi<'Bar'>;
    removeSeries(series: ISeriesApi<any>): void;
    subscribeCrosshairMove(handler: (param: MouseEventParams) => void): void;
    unsubscribeCrosshairMove(handler: (param: MouseEventParams) => void): void;
    subscribeClick(handler: (param: MouseEventParams) => void): void;
    unsubscribeClick(handler: (param: MouseEventParams) => void): void;
    timeScale(): TimeScaleApi;
  }

  export interface TimeScaleApi {
    scrollOffset(): number;
    scrollToPosition(position: number, animated?: boolean): void;
    scrollToRealTime(): void;
    getVisibleRange(): Range<Time> | null;
    setVisibleRange(range: Range<Time>): void;
    resetTimeScale(): void;
    fitContent(): void;
    applyOptions(options: TimeScaleOptions): void;
    options(): TimeScaleOptions;
  }

  export interface Range<T> {
    from: T;
    to: T;
  }

  export interface ISeriesApi<T extends SeriesType> {
    applyOptions(options: SeriesOptions<T>): void;
    options(): SeriesOptions<T>;
    setData(data: SeriesDataItemTypeMap[T][]): void;
    update(bar: SeriesDataItemTypeMap[T]): void;
    setMarkers(data: SeriesMarker[]): void;
    remove(): void;
    priceScale(): PriceScaleApi;
  }

  export interface PriceScaleApi {
    applyOptions(options: PriceScaleOptions): void;
    options(): PriceScaleOptions;
  }

  export interface SeriesMarker {
    time: Time;
    position: SeriesMarkerPosition;
    color: string;
    shape: SeriesMarkerShape;
    text?: string;
    size?: number;
  }

  export interface SeriesOptions<T> {
    title?: string;
    visible?: boolean;
    priceFormat?: PriceFormat;
    priceScaleId?: string;
    overlay?: boolean;
    scaleMargins?: { top: number; bottom: number };
  }

  export interface CandlestickSeriesOptions extends SeriesOptions<'Candlestick'> {
    upColor?: string;
    downColor?: string;
    borderDownColor?: string;
    borderUpColor?: string;
    wickDownColor?: string;
    wickUpColor?: string;
    borderWidth?: number;
    wickWidth?: number;
  }

  export interface LineSeriesOptions extends SeriesOptions<'Line'> {
    color?: string;
    lineWidth?: number;
    lineStyle?: LineStyle;
    lineType?: LineType;
    crosshairMarkerVisible?: boolean;
    crosshairMarkerRadius?: number;
    crosshairMarkerBorderColor?: string;
    crosshairMarkerBackgroundColor?: string;
    lastValueVisible?: boolean;
    priceLineVisible?: boolean;
    priceLineWidth?: number;
    priceLineColor?: string;
    priceLineStyle?: LineStyle;
    baseLineVisible?: boolean;
    baseLineColor?: string;
    baseLineWidth?: number;
    baseLineStyle?: LineStyle;
    priceFormat?: PriceFormat;
  }

  export interface HistogramSeriesOptions extends SeriesOptions<'Histogram'> {
    color?: string;
    base?: number;
    lineColor?: string;
    lineWidth?: number;
    priceFormat?: PriceFormat;
    priceScaleId?: string;
  }

  export interface AreaSeriesOptions extends SeriesOptions<'Area'> {
    topColor?: string;
    bottomColor?: string;
    lineColor?: string;
    lineStyle?: LineStyle;
    lineWidth?: number;
    crosshairMarkerVisible?: boolean;
    crosshairMarkerRadius?: number;
    crosshairMarkerBorderColor?: string;
    crosshairMarkerBackgroundColor?: string;
    lastValueVisible?: boolean;
    priceLineVisible?: boolean;
    priceLineWidth?: number;
    priceLineColor?: string;
    priceLineStyle?: LineStyle;
    baseLineVisible?: boolean;
    baseLineColor?: string;
    baseLineWidth?: number;
    baseLineStyle?: LineStyle;
    priceFormat?: PriceFormat;
  }

  export interface BarSeriesOptions extends SeriesOptions<'Bar'> {
    upColor?: string;
    downColor?: string;
    openVisible?: boolean;
    thinBars?: boolean;
    priceFormat?: PriceFormat;
  }

  export interface PriceFormat {
    type: 'price' | 'volume' | 'percent';
    precision?: number;
    minMove?: number;
  }

  export type SeriesType = 'Line' | 'Candlestick' | 'Area' | 'Bar' | 'Histogram';

  export interface SeriesDataItemTypeMap {
    Line: LineData;
    Candlestick: CandlestickData;
    Area: AreaData;
    Bar: BarData;
    Histogram: HistogramData;
  }

  export interface LineData {
    time: Time;
    value: number;
  }

  export interface CandlestickData {
    time: Time;
    open: number;
    high: number;
    low: number;
    close: number;
  }

  export interface AreaData {
    time: Time;
    value: number;
  }

  export interface BarData {
    time: Time;
    open: number;
    high: number;
    low: number;
    close: number;
  }

  export interface HistogramData {
    time: Time;
    value: number;
    color?: string;
  }

  export enum LineStyle {
    Solid = 0,
    Dotted = 1,
    Dashed = 2,
    LargeDashed = 3,
    SparseDotted = 4,
  }

  export enum LineType {
    Simple,
    WithSteps,
    Curved,
  }

  export enum CrosshairMode {
    Normal,
    Magnet,
  }

  export enum PriceScaleMode {
    Normal,
    Logarithmic,
    Percentage,
    IndexedTo100,
  }

  export enum ColorType {
    Solid,
    VerticalGradient,
  }

  export enum SeriesMarkerPosition {
    AboveBar = 'aboveBar',
    BelowBar = 'belowBar',
    InBar = 'inBar',
  }

  export enum SeriesMarkerShape {
    Circle = 'circle',
    Square = 'square',
    TriangleUp = 'triangleUp',
    TriangleDown = 'triangleDown',
    ArrowUp = 'arrowUp',
    ArrowDown = 'arrowDown',
    Cross = 'cross',
    Plus = 'plus',
  }

  export function createChart(container: HTMLElement | string, options?: ChartOptions): IChartApi;
}