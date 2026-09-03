/**
 * Chart theme hook — returns theme-aware colors for Recharts components.
 * Reads the current dark/light mode from the document root class.
 */
import { useState, useEffect } from 'react';

export function useIsDark(): boolean {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export interface ChartTheme {
  grid: string;
  axis: string;
  tickFill: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  cardBg: string;
  cardBorder: string;
  textMuted: string;
}

export function useChartTheme(): ChartTheme {
  const dark = useIsDark();
  if (dark) {
    return {
      grid: '#21262D',
      axis: '#8B949E',
      tickFill: '#8B949E',
      tooltipBg: '#161B22',
      tooltipBorder: '#21262D',
      tooltipText: '#E6EDF3',
      cardBg: '#161B22',
      cardBorder: '#21262D',
      textMuted: '#8B949E',
    };
  }
  return {
    grid: '#E2E8F0',
    axis: '#A0AEC0',
    tickFill: '#718096',
    tooltipBg: '#FFFFFF',
    tooltipBorder: '#E2E8F0',
    tooltipText: '#1A202C',
    cardBg: '#FFFFFF',
    cardBorder: '#E2E8F0',
    textMuted: '#718096',
  };
}
