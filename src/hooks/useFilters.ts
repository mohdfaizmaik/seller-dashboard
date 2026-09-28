import { useSearchParams } from 'react-router-dom';

export type PlatformFilter = 'all' | 'amazon' | 'flipkart' | 'meesho';
export type DatePresetFilter = 'today' | '7d' | '30d' | 'ytd' | 'custom';

export interface DashboardFilters {
  platform: PlatformFilter;
  preset: DatePresetFilter;
  startDate?: string;
  endDate?: string;
}

export function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse platform parameter
  const platformStr = searchParams.get('platform');
  const platform: PlatformFilter = (platformStr === 'amazon' || platformStr === 'flipkart' || platformStr === 'meesho')
    ? platformStr
    : 'all';

  // Parse preset parameter
  const presetStr = searchParams.get('preset');
  const preset: DatePresetFilter = (presetStr === 'today' || presetStr === '7d' || presetStr === '30d' || presetStr === 'ytd' || presetStr === 'custom')
    ? presetStr
    : '30d';

  // Get custom date ranges if they exist
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  /**
   * Updates URL filter query parameters.
   * Cleaning up lingering date inputs automatically when switching back to quick presets.
   */
  const setFilters = (newFilters: Partial<DashboardFilters>) => {
    const nextParams = new URLSearchParams(searchParams);

    // Platform update
    if (newFilters.platform !== undefined) {
      if (newFilters.platform === 'all') {
        nextParams.delete('platform');
      } else {
        nextParams.set('platform', newFilters.platform);
      }
    }

    // Preset update
    if (newFilters.preset !== undefined) {
      nextParams.set('preset', newFilters.preset);
      if (newFilters.preset !== 'custom') {
        nextParams.delete('startDate');
        nextParams.delete('endDate');
      }
    }

    // Determine target preset after update to apply/prune custom dates appropriately
    const activePreset = newFilters.preset !== undefined ? newFilters.preset : preset;

    if (activePreset === 'custom') {
      if (newFilters.startDate !== undefined) {
        if (newFilters.startDate === '') {
          nextParams.delete('startDate');
        } else {
          nextParams.set('startDate', newFilters.startDate);
        }
      }
      if (newFilters.endDate !== undefined) {
        if (newFilters.endDate === '') {
          nextParams.delete('endDate');
        } else {
          nextParams.set('endDate', newFilters.endDate);
        }
      }
    } else {
      // Clean up in case custom dates were passed without setting preset to custom
      if (newFilters.startDate || newFilters.endDate) {
        nextParams.set('preset', 'custom');
        if (newFilters.startDate) nextParams.set('startDate', newFilters.startDate);
        if (newFilters.endDate) nextParams.set('endDate', newFilters.endDate);
      }
    }

    setSearchParams(nextParams);
  };

  return {
    platform,
    preset,
    startDate,
    endDate,
    setFilters
  };
}
