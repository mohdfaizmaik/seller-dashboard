import { useState, useMemo, useCallback } from 'react';
import { useSellerData } from './useSellerData';
import { useSkuCosts } from './useSkuCosts';
import { useFilters } from './useFilters';
import { getDateRangeFromPreset } from '../services/analyticsService';
import {
  calculateCashFlowForecast,
  getStoredStartingCash,
  saveStartingCash,
  DEFAULT_SIMULATION
} from '../services/cashflow/cashflowService';
import type { CashFlowSummary, ScenarioSimulation } from '../models/cashflow';

export function useCashFlowData() {
  const { orders } = useSellerData();
  const { skuCostsMap } = useSkuCosts();
  const { platform, preset, startDate, endDate } = useFilters();

  const [startingCash, setStartingCashState] = useState<number>(() => getStoredStartingCash());
  const [simulation, setSimulation] = useState<ScenarioSimulation>(DEFAULT_SIMULATION);

  const { start, end } = useMemo(
    () => getDateRangeFromPreset(preset, startDate, endDate, orders),
    [preset, startDate, endDate, orders]
  );

  const setStartingCash = useCallback((amount: number) => {
    saveStartingCash(amount);
    setStartingCashState(amount);
  }, []);

  const updateSimulation = useCallback((partial: Partial<ScenarioSimulation>) => {
    setSimulation((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetSimulation = useCallback(() => {
    setSimulation(DEFAULT_SIMULATION);
  }, []);

  const summary: CashFlowSummary = useMemo(() => {
    return calculateCashFlowForecast(
      orders,
      {
        platform,
        start,
        end,
        skuCostsMap,
        startingCash
      },
      simulation
    );
  }, [orders, platform, start, end, skuCostsMap, startingCash, simulation]);

  return {
    summary,
    startingCash,
    setStartingCash,
    simulation,
    updateSimulation,
    resetSimulation,
    platform,
    dateRange: { start, end }
  };
}
