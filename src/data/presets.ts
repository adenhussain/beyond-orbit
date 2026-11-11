import type { Build } from '../types/spacecraft';

/**
 * Reference designs the player can load in the Engineering Lab as a starting
 * point. They are launchable but deliberately not optimal.
 */
export const REFERENCE_BUILDS: Record<string, Build> = {
  lunar: {
    bus: ['bus_std'], thermal: ['th_loop'], generation: ['pw_solar_l'], storage: ['bat_m'],
    instruments: ['sci_neutron', 'sci_drill', 'sci_spec'], antenna: ['com_hga'], backup: [],
    engine: ['eng_biprop'], tank: ['tank_m'], cpu: ['cpu_rad'], nav: ['nav_star'],
  },
  mars: {
    bus: ['bus_std'], thermal: ['th_loop'], generation: ['pw_solar_l'], storage: ['bat_m'],
    instruments: ['sci_drill', 'sci_spec', 'sci_weather'], antenna: ['com_hga'], backup: [],
    engine: ['eng_biprop'], tank: ['tank_m'], cpu: ['cpu_rad'], nav: ['nav_star'],
  },
};
