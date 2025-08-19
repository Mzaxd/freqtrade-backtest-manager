import type { CrosshairMode, PriceScaleMode, LineStyle } from 'lightweight-charts'

export interface ChartTheme {
  name: string;
  mode: 'light' | 'dark';
  background: string;
  textColor: string;
  gridColor: string;
  crosshairColor: string;
  borderColor: string;
  upColor: string;
  downColor: string;
  volumeUpColor: string;
  volumeDownColor: string;
  tooltipBackground: string;
  tooltipText: string;
  panelBackground: string;
  panelBorder: string;
  buttonBackground: string;
  buttonText: string;
  buttonHover: string;
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  successColor: string;
  errorColor: string;
  warningColor: string;
  infoColor: string;
}

export const chartThemes: Record<string, ChartTheme> = {
  light: {
    name: 'Light',
    mode: 'light',
    background: '#ffffff',
    textColor: '#333333',
    gridColor: '#f0f0f0',
    crosshairColor: '#758696',
    borderColor: '#f0f0f0',
    upColor: '#26a69a',
    downColor: '#ef5350',
    volumeUpColor: '#26a69a',
    volumeDownColor: '#ef5350',
    tooltipBackground: '#ffffff',
    tooltipText: '#333333',
    panelBackground: '#ffffff',
    panelBorder: '#e2e8f0',
    buttonBackground: '#ffffff',
    buttonText: '#374151',
    buttonHover: '#f3f4f6',
    inputBackground: '#ffffff',
    inputBorder: '#d1d5db',
    inputText: '#374151',
    successColor: '#10b981',
    errorColor: '#ef4444',
    warningColor: '#f59e0b',
    infoColor: '#3b82f6',
  },
  dark: {
    name: 'Dark',
    mode: 'dark',
    background: '#0d1117',
    textColor: '#c9d1d9',
    gridColor: '#30363d',
    crosshairColor: '#6e7681',
    borderColor: '#30363d',
    upColor: '#26a69a',
    downColor: '#ef5350',
    volumeUpColor: '#26a69a',
    volumeDownColor: '#ef5350',
    tooltipBackground: '#161b22',
    tooltipText: '#c9d1d9',
    panelBackground: '#161b22',
    panelBorder: '#30363d',
    buttonBackground: '#21262d',
    buttonText: '#c9d1d9',
    buttonHover: '#30363d',
    inputBackground: '#0d1117',
    inputBorder: '#30363d',
    inputText: '#c9d1d9',
    successColor: '#26a69a',
    errorColor: '#f85149',
    warningColor: '#f0883e',
    infoColor: '#58a6ff',
  },
  tradingview: {
    name: 'TradingView',
    mode: 'dark',
    background: '#131722',
    textColor: '#d1d4dc',
    gridColor: '#2a2e39',
    crosshairColor: '#9194a1',
    borderColor: '#2a2e39',
    upColor: '#26a69a',
    downColor: '#ef5350',
    volumeUpColor: '#26a69a',
    volumeDownColor: '#ef5350',
    tooltipBackground: '#1e222d',
    tooltipText: '#d1d4dc',
    panelBackground: '#1e222d',
    panelBorder: '#2a2e39',
    buttonBackground: '#2a2e39',
    buttonText: '#d1d4dc',
    buttonHover: '#363a45',
    inputBackground: '#131722',
    inputBorder: '#2a2e39',
    inputText: '#d1d4dc',
    successColor: '#26a69a',
    errorColor: '#ef5350',
    warningColor: '#ffa500',
    infoColor: '#58a6ff',
  },
  professional: {
    name: 'Professional',
    mode: 'dark',
    background: '#000000',
    textColor: '#e0e0e0',
    gridColor: '#1a1a1a',
    crosshairColor: '#666666',
    borderColor: '#1a1a1a',
    upColor: '#00ff88',
    downColor: '#ff3366',
    volumeUpColor: '#00ff88',
    volumeDownColor: '#ff3366',
    tooltipBackground: '#1a1a1a',
    tooltipText: '#e0e0e0',
    panelBackground: '#1a1a1a',
    panelBorder: '#333333',
    buttonBackground: '#1a1a1a',
    buttonText: '#e0e0e0',
    buttonHover: '#333333',
    inputBackground: '#000000',
    inputBorder: '#333333',
    inputText: '#e0e0e0',
    successColor: '#00ff88',
    errorColor: '#ff3366',
    warningColor: '#ffaa00',
    infoColor: '#00aaff',
  },
};

export function getChartTheme(themeName: string = 'light'): ChartTheme {
  return chartThemes[themeName] || chartThemes.light;
}

export function getChartOptions(theme: ChartTheme) {
  return {
    layout: {
      backgroundColor: theme.background,
      textColor: theme.textColor,
    },
    grid: {
      vertLines: { 
        color: theme.gridColor,
        style: LineStyle.Dashed,
      },
      horzLines: { 
        color: theme.gridColor,
        style: LineStyle.Dashed,
      },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        width: 1,
        color: theme.crosshairColor,
        style: LineStyle.Dashed,
      },
      horzLine: {
        width: 1,
        color: theme.crosshairColor,
        style: LineStyle.Dashed,
      },
    },
    rightPriceScale: {
      borderColor: theme.borderColor,
      mode: PriceScaleMode.Normal,
    },
    timeScale: {
      borderColor: theme.borderColor,
      timeVisible: true,
      secondsVisible: false,
    },
  };
}