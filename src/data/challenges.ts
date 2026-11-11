import type { Challenge } from '../types/challenge';

/**
 * Three challenges per mission, two options each.
 * Options set FLAGS (e.g. "loop_patched") that later challenges and hazards
 * (events.ts) check. That is how one decision changes the rest of the story.
 */
export const CHALLENGES: Challenge[] = [
  // ======================= LUNAR SOUTH POLE =======================
  {
    id: 'lunar_coolant',
    missionId: 'lunar',
    index: 0,
    title: 'Coolant Loop Pressure Drop',
    alert: 'THERMAL — LOOP PRESSURE FALLING',
    room: 'life',
    description:
      'A micrometeoroid has punctured a radiator line. Coolant pressure is dropping 3% per minute. Without that loop the instrument bay cannot hold temperature on the surface.',
    situation: [
      {
        id: 'lunar_c1_fittings',
        when: [{ stat: 'debt.reliability', gte: 40 }],
        effects: [{ kind: 'debt', debt: 'thermal', amount: 8 }],
        title: 'Low-grade fittings widen the leak',
        narrative: 'The impact shock cracked a second fitting. Lower-reliability hardware is leaking faster than the fault model predicted.',
        severity: 'warn',
      },
    ],
    options: [
      {
        id: 'A',
        label: 'Isolate the Leaking Loop',
        summary: 'Close the isolation valves and run on the remaining thermal capacity.',
        pros: ['No risk of making the damage worse', 'Uses no stored energy'],
        cons: ['Permanently reduces thermal protection', 'One instrument bay loses temperature control'],
        advisories: [
          { when: [{ stat: 'debt.thermal', gte: 40 }], level: 'crit', text: 'THERMAL: your design already runs below the required thermal rating. Losing a loop leaves very little margin for the lunar cold.' },
          { when: [{ stat: 'debt.thermal', lt: 40 }], level: 'good', text: 'THERMAL: the design has margin. It can absorb the loss of one loop.' },
        ],
        branches: [
          {
            effects: [
              { kind: 'debt', debt: 'thermal', amount: 18 },
              { kind: 'science', pct: -12 },
              { kind: 'flag', flag: 'loop_isolated' },
            ],
            title: 'Loop isolated',
            narrative: 'Valves closed. The leak has stopped, but the aft instrument bay is now unregulated and one instrument will run outside its calibrated range.',
            verdict: 'mixed',
          },
        ],
      },
      {
        id: 'B',
        label: 'Attempt Emergency Patch Repair',
        summary: 'Run heaters and the sealant injector to patch and repressurise the loop.',
        pros: ['Keeps full thermal capacity if it works', 'No science loss if it works'],
        cons: ['Uses one repair kit and 35% of the battery', 'Needs fast, precise valve sequencing', 'A patched line stays a weak point'],
        lockedWhen: {
          when: [{ stat: 'repairKits', lt: 1 }],
          reason: 'No repair kits aboard. None were collected before launch.',
        },
        advisories: [
          { when: [{ stat: 'compute', lt: 60 }], level: 'crit', text: 'AVIONICS: the flight computer is too slow to run the valve sequence inside the timing window.' },
          { when: [{ stat: 'debt.reliability', gte: 40 }], level: 'crit', text: 'SYSTEMS: low-reliability plumbing may not hold repressurisation.' },
          { when: [{ stat: 'compute', gte: 60 }, { stat: 'debt.reliability', lt: 40 }], level: 'good', text: 'SYSTEMS: computer speed and hardware quality support the repair sequence.' },
          { level: 'warn', text: 'POWER: the repair spends 35% of battery capacity that will not fully recharge before landing.' },
        ],
        branches: [
          {
            when: [{ stat: 'compute', lt: 60 }],
            effects: [
              { kind: 'battery', pctOfCapacity: -35 },
              { kind: 'repair', amount: -1 },
              { kind: 'oxygen', amount: -10 },
              { kind: 'debt', debt: 'thermal', amount: 30 },
              { kind: 'health', system: 'structure', amount: -25 },
              { kind: 'science', pct: -12 },
              { kind: 'flag', flag: 'loop_failed' },
            ],
            title: 'Repair failed — valve timing overrun',
            narrative: 'The flight computer could not sequence the valves fast enough. Sealant set in the wrong section and the loop vented completely.',
            verdict: 'bad',
          },
          {
            when: [{ stat: 'debt.reliability', gte: 40 }],
            effects: [
              { kind: 'battery', pctOfCapacity: -35 },
              { kind: 'repair', amount: -1 },
              { kind: 'oxygen', amount: -10 },
              { kind: 'debt', debt: 'thermal', amount: 30 },
              { kind: 'health', system: 'structure', amount: -25 },
              { kind: 'science', pct: -12 },
              { kind: 'flag', flag: 'loop_failed' },
            ],
            title: 'Repair failed — fitting burst',
            narrative: 'The patch held, but a low-grade fitting burst when the loop was repressurised. All coolant in the loop is gone.',
            verdict: 'bad',
          },
          {
            effects: [
              { kind: 'battery', pctOfCapacity: -35 },
              { kind: 'repair', amount: -1 },
              { kind: 'debt', debt: 'reliability', amount: 6 },
              { kind: 'flag', flag: 'loop_patched' },
            ],
            title: 'Patch holding',
            narrative: 'Sealant injected and the loop repressurised. Full thermal capacity is restored, though the battery is noticeably depleted.',
            verdict: 'good',
          },
        ],
      },
    ],
  },
  {
    id: 'lunar_antenna',
    missionId: 'lunar',
    index: 1,
    title: 'Antenna Pointing Fault',
    alert: 'COMMS — EARTH-POINT ERROR 11°',
    room: 'comms',
    description:
      'The primary antenna is stuck 11° off Earth. Mission Control cannot uplink the final hazard map of the landing site. Descent begins in six hours.',
    situation: [
      {
        id: 'lunar_c2_warp',
        when: [{ flag: 'loop_failed' }],
        effects: [{ kind: 'comm', pct: -15 }],
        title: 'Thermal distortion worsens the pointing error',
        narrative: 'With the coolant loop vented, the antenna boom is flexing between sun and shadow. Signal strength is down further.',
        severity: 'warn',
      },
    ],
    options: [
      {
        id: 'A',
        label: 'Reorient the Spacecraft',
        summary: 'Slew the whole vehicle to point the antenna at Earth and receive the hazard map.',
        pros: ['Restores the full data rate', 'Hazard map uploaded before descent'],
        cons: ['Burns propellant equal to 10% of the mission requirement', 'Reduces the landing fuel reserve'],
        advisories: [
          { when: [{ stat: 'fuelReservePct', lt: 10 }], level: 'crit', text: 'PROPULSION: fuel reserve is below 10%. This slew uses propellant the landing burn needs.' },
          { when: [{ stat: 'fuelReservePct', gte: 10 }], level: 'good', text: 'PROPULSION: the fuel reserve covers the slew and the landing burn.' },
        ],
        branches: [
          {
            effects: [
              { kind: 'fuel', pctOfRequired: -10 },
              { kind: 'flag', flag: 'map_uploaded' },
            ],
            title: 'Earth-point restored',
            narrative: 'Slew complete. The high-rate link is back and the hazard map is on board. Propellant was spent to get it.',
            verdict: 'good',
          },
        ],
      },
      {
        id: 'B',
        label: 'Switch to Emergency Comm Mode',
        summary: 'Fall back to the low-rate emergency link and descend without the hazard map.',
        pros: ['Uses no propellant', 'Keeps the full landing fuel reserve'],
        cons: ['Data rate drops by 60% for the rest of the mission', 'Landing relies entirely on onboard navigation'],
        advisories: [
          { when: [{ stat: 'nav', lt: 80 }], level: 'crit', text: 'GUIDANCE: without the map, your navigation sensors cannot identify boulders or slopes at the landing site.' },
          { when: [{ stat: 'nav', gte: 80 }], level: 'good', text: 'GUIDANCE: terrain-relative navigation can find a safe site without the map.' },
          { when: [{ stat: 'debt.comm', gte: 30 }], level: 'warn', text: 'COMMS: the downlink is already marginal for your data volume. A 60% cut will strand science on board.' },
        ],
        branches: [
          {
            effects: [
              { kind: 'comm', pct: -60 },
              { kind: 'debt', debt: 'comm', amount: 25 },
              { kind: 'flag', flag: 'no_map' },
            ],
            title: 'Emergency link active',
            narrative: 'Low-rate link established. Telemetry is flowing, but the hazard map could not be sent. The lander will pick its own touchdown point.',
            verdict: 'mixed',
          },
        ],
      },
    ],
  },
  {
    id: 'lunar_power',
    missionId: 'lunar',
    index: 2,
    title: 'Power Generation Degraded',
    alert: 'POWER — GENERATION BELOW PREDICTION',
    room: 'power',
    description:
      'Landing dust has coated the power system and the Sun is skimming the crater rim. Generation has dropped just as the science campaign begins.',
    situation: [
      {
        id: 'lunar_c3_rtg',
        when: [{ stat: 'solar', lt: 1 }],
        effects: [{ kind: 'powerGen', pct: -12 }],
        title: 'RTG radiator fins dusted',
        narrative: 'Regolith on the radiator fins lowers the converter efficiency. The loss is small because the RTG does not depend on sunlight.',
        severity: 'info',
      },
      {
        id: 'lunar_c3_shadow',
        when: [{ stat: 'solar', gte: 1 }, { flag: 'offtarget' }],
        effects: [{ kind: 'powerGen', pct: -65 }],
        title: 'Off-target site is in partial shadow',
        narrative: 'The lander came down on a shadowed slope. Dust plus long shadows cut solar output by almost two thirds.',
        severity: 'crit',
      },
      {
        id: 'lunar_c3_dust',
        when: [{ stat: 'solar', gte: 1 }, { notFlag: 'offtarget' }],
        effects: [{ kind: 'powerGen', pct: -45 }],
        title: 'Solar arrays dusted',
        narrative: 'Dust and the low sun angle cut solar output by almost half.',
        severity: 'warn',
      },
      {
        id: 'lunar_c3_patch',
        when: [{ flag: 'loop_patched' }],
        effects: [{ kind: 'powerDraw', pct: 8 }],
        title: 'Patched loop needs extra heating',
        narrative: 'The sealant patch stiffens in the cold. Heaters on that line are drawing extra power to keep coolant moving.',
        severity: 'warn',
      },
    ],
    options: [
      {
        id: 'A',
        label: 'Shed Non-Essential Loads',
        summary: 'Power down secondary instruments and run a reduced science campaign.',
        pros: ['Power demand drops by 30%', 'Protects the battery and survival heaters'],
        cons: ['Science output cut by 35%'],
        advisories: [
          { when: [{ stat: 'powerMarginPct', gte: 0 }], level: 'warn', text: 'POWER: generation still covers the full load. Shedding instruments may give up science for nothing.' },
          { when: [{ stat: 'powerMarginPct', lt: 0 }], level: 'good', text: 'POWER: load shedding brings demand back toward what the generator can supply.' },
        ],
        branches: [
          {
            effects: [
              { kind: 'powerDraw', pct: -30 },
              { kind: 'science', pct: -35 },
              { kind: 'flag', flag: 'loads_shed' },
            ],
            title: 'Reduced science campaign',
            narrative: 'Secondary instruments are off. The primary instrument runs on a tight schedule and the power bus is stable.',
            verdict: 'mixed',
          },
        ],
      },
      {
        id: 'B',
        label: 'Activate Backup Power',
        summary: 'Keep every instrument running and cover the shortfall from the battery.',
        pros: ['Full science campaign continues'],
        cons: ['Drains stored energy', 'A flat battery means brown-outs and lost data'],
        advisories: [
          { when: [{ stat: 'powerMarginPct', gte: 0 }], level: 'good', text: 'POWER: generation still exceeds demand. The battery only has to smooth peaks.' },
          { when: [{ stat: 'powerMarginPct', lt: 0 }, { stat: 'backupHours', gte: 30 }], level: 'good', text: 'POWER: the battery can cover the deficit for the full 30-hour science campaign.' },
          { when: [{ stat: 'powerMarginPct', lt: 0 }, { stat: 'backupHours', lt: 30 }], level: 'crit', text: 'POWER: stored energy cannot cover the deficit for the 30-hour science campaign. Expect a brown-out.' },
        ],
        lockedWhen: {
          when: [{ stat: 'batteryPct', lt: 20 }],
          reason: 'Battery below 20% — there is no backup power to activate.',
        },
        branches: [
          {
            when: [{ stat: 'powerMarginPct', gte: 0 }],
            effects: [{ kind: 'battery', pctOfCapacity: -10 }],
            title: 'Full campaign on generator power',
            narrative: 'Generation still covers the load. The battery only handled peaks while every instrument completed its run.',
            verdict: 'good',
          },
          {
            when: [{ stat: 'backupHours', gte: 30 }],
            effects: [
              { kind: 'battery', pctOfCapacity: -55 },
              { kind: 'debt', debt: 'power', amount: 10 },
            ],
            title: 'Battery carried the campaign',
            narrative: 'The battery supplied the shortfall for the whole campaign. Every instrument finished, and the reserve is now thin.',
            verdict: 'good',
          },
          {
            effects: [
              { kind: 'battery', pctOfCapacity: -100 },
              { kind: 'oxygen', amount: -25 },
              { kind: 'science', pct: -45 },
              { kind: 'debt', debt: 'power', amount: 30 },
              { kind: 'debt', debt: 'thermal', amount: 15 },
              { kind: 'health', system: 'computer', amount: -30 },
              { kind: 'flag', flag: 'brownout' },
            ],
            title: 'Brown-out during science operations',
            narrative: 'The battery ran flat mid-campaign. The bus voltage collapsed, the computer reset, survival heaters dropped out and the data in work was lost.',
            verdict: 'bad',
          },
        ],
      },
    ],
  },

  // ======================= MARS SAMPLE COLLECTION =======================
  {
    id: 'mars_storm',
    missionId: 'mars',
    index: 0,
    title: 'Solar Particle Event',
    alert: 'RADIATION — PROTON FLUX RISING',
    room: 'command',
    description:
      'A coronal mass ejection will reach the spacecraft in 40 minutes, exactly when trajectory correction burn TCM-2 is scheduled. Running electronics through the storm exposes them to damage.',
    // Driven by REAL solar activity: the flags come from NASA's DONKI data at launch.
    situation: [
      {
        id: 'mars_c1_sw_strong',
        when: [{ flag: 'sw_strong' }],
        effects: [{ kind: 'debt', debt: 'reliability', amount: 10 }],
        title: 'Live data: the real Sun is very active',
        narrative: 'NASA recorded a very fast coronal mass ejection (1,500 km/s or more) in the month before launch. This storm is modelled at full strength, and the electronics have already absorbed extra radiation during cruise.',
        severity: 'warn',
      },
      {
        id: 'mars_c1_sw_moderate',
        when: [{ flag: 'sw_moderate' }],
        effects: [{ kind: 'debt', debt: 'reliability', amount: 5 }],
        title: 'Live data: the real Sun is moderately active',
        narrative: 'NASA recorded a fast coronal mass ejection (over 1,000 km/s) in the month before launch. The electronics have absorbed a little extra radiation during cruise.',
        severity: 'info',
      },
      {
        id: 'mars_c1_sw_quiet',
        when: [{ flag: 'sw_quiet' }],
        effects: [],
        title: 'Live data: the real Sun is quiet',
        narrative: 'NASA recorded only slow coronal mass ejections in the month before launch, so cruise radiation was low. This storm is a rare, isolated event.',
        severity: 'good',
      },
    ],
    options: [
      {
        id: 'A',
        label: 'Enter Safe Mode',
        summary: 'Power down the computer and instruments, ride out the storm and burn later.',
        pros: ['Electronics are protected', 'No hardware damage'],
        cons: ['TCM-2 is missed', 'A late correction costs more propellant'],
        advisories: [
          { when: [{ stat: 'fuelReservePct', lt: 15 }], level: 'crit', text: 'PROPULSION: fuel reserve is under 15%. A late correction burn may leave too little for landing.' },
          { when: [{ stat: 'fuelReservePct', gte: 15 }], level: 'good', text: 'PROPULSION: the fuel reserve can absorb a more expensive correction burn later.' },
        ],
        branches: [
          {
            effects: [{ kind: 'flag', flag: 'tcm_delayed' }],
            title: 'Storm passed in safe mode',
            narrative: 'The spacecraft slept through the storm with no damage. It is now drifting off the planned trajectory, and the error grows every day.',
            verdict: 'mixed',
          },
        ],
      },
      {
        id: 'B',
        label: 'Stay Operational and Burn on Schedule',
        summary: 'Keep the computer running and execute TCM-2 during the storm.',
        pros: ['Trajectory stays on target', 'No extra propellant needed'],
        cons: ['Electronics take the full radiation dose', 'Damage depends on computer hardening'],
        advisories: [
          { when: [{ stat: 'radHard', gte: 80 }], level: 'good', text: 'AVIONICS: the radiation-hardened computer is designed for this dose.' },
          { when: [{ stat: 'radHard', gte: 60 }, { stat: 'radHard', lt: 80 }], level: 'warn', text: 'AVIONICS: redundant computers can outvote upsets, but one string may be lost.' },
          { when: [{ stat: 'radHard', lt: 60 }], level: 'crit', text: 'AVIONICS: the commercial computer has no radiation protection. Expect memory corruption.' },
        ],
        branches: [
          {
            when: [{ stat: 'radHard', gte: 80 }],
            effects: [
              { kind: 'health', system: 'computer', amount: -5 },
              { kind: 'flag', flag: 'tcm_on_time' },
            ],
            title: 'Burn complete, electronics nominal',
            narrative: 'The hardened computer logged a few corrected bit flips and executed the burn precisely. Trajectory is on target.',
            verdict: 'good',
          },
          {
            when: [{ stat: 'radHard', gte: 60 }],
            effects: [
              { kind: 'health', system: 'computer', amount: -15 },
              { kind: 'debt', debt: 'reliability', amount: 10 },
              { kind: 'flag', flag: 'tcm_on_time' },
            ],
            title: 'Burn complete, one computer string lost',
            narrative: 'One of the three computers latched up and was voted out. The burn completed on the remaining two, with less redundancy left.',
            verdict: 'mixed',
          },
          {
            effects: [
              { kind: 'health', system: 'computer', amount: -45 },
              { kind: 'debt', debt: 'reliability', amount: 30 },
              { kind: 'flag', flag: 'tcm_on_time' },
              { kind: 'flag', flag: 'rad_damage' },
              { kind: 'oxygen', amount: -10 },
            ],
            title: 'Burn complete, computer memory corrupted',
            narrative: 'The burn finished, but the unshielded computer took hundreds of bit flips. Parts of its memory, including fault-protection tables, are corrupted.',
            verdict: 'bad',
          },
        ],
      },
    ],
  },
  {
    id: 'mars_relay',
    missionId: 'mars',
    index: 1,
    title: 'Relay Orbiter Link Lost',
    alert: 'COMMS — RELAY ORBITER SILENT',
    room: 'comms',
    description:
      'The orbiter that was to relay your landing telemetry has gone silent. With a 14-minute light delay nobody on Earth can help during descent. You must choose where to land.',
    situation: [
      {
        id: 'mars_c2_latetcm',
        when: [{ flag: 'tcm_delayed' }],
        effects: [{ kind: 'fuel', pctOfRequired: -12 }],
        title: 'Late trajectory correction',
        narrative: 'The correction burn skipped during the solar storm had to be made this close to Mars, where the same course change costs far more propellant.',
        severity: 'warn',
      },
    ],
    options: [
      {
        id: 'A',
        label: 'Divert to the Backup Landing Site',
        summary: 'Retarget to a flat plain with a direct view of Earth.',
        pros: ['Smooth, hazard-free terrain', 'Direct line of sight to Earth during landing'],
        cons: ['Retargeting burns 10% of required propellant', 'Less interesting geology: science reduced 20%'],
        advisories: [
          { when: [{ stat: 'fuelReservePct', lt: 10 }], level: 'crit', text: 'PROPULSION: fuel reserve is below 10%. The divert burn uses propellant the landing needs.' },
          { when: [{ stat: 'fuelReservePct', gte: 10 }], level: 'good', text: 'PROPULSION: the fuel reserve covers the divert and the landing burn.' },
        ],
        branches: [
          {
            effects: [
              { kind: 'fuel', pctOfRequired: -10 },
              { kind: 'science', pct: -20 },
              { kind: 'flag', flag: 'backup_site' },
            ],
            title: 'Retargeted to the backup site',
            narrative: 'Divert burn complete. The new target is a flat volcanic plain: safe to land on, with poorer sampling prospects than the delta.',
            verdict: 'mixed',
          },
        ],
      },
      {
        id: 'B',
        label: 'Commit to the Primary Site',
        summary: 'Hold course for the river delta and land fully autonomously.',
        pros: ['Best science site on the planet', 'No propellant spent'],
        cons: ['Rocky terrain with no help from Earth', 'Success depends on navigation and a healthy computer'],
        advisories: [
          { when: [{ stat: 'nav', gte: 80 }, { stat: 'health.computer', gte: 70 }], level: 'good', text: 'GUIDANCE: terrain-relative navigation and a healthy computer can land in the delta unaided.' },
          { when: [{ stat: 'nav', lt: 80 }], level: 'crit', text: 'GUIDANCE: your navigation sensors cannot detect rocks. An autonomous landing in the delta is high risk.' },
          { when: [{ stat: 'health.computer', lt: 70 }], level: 'crit', text: 'AVIONICS: the damaged computer may not process landing imagery in time.' },
        ],
        branches: [
          {
            effects: [
              { kind: 'debt', debt: 'comm', amount: 10 },
              { kind: 'flag', flag: 'primary_site' },
            ],
            title: 'Committed to the delta',
            narrative: 'Course held. The spacecraft will enter the atmosphere on its own and steer itself to the delta.',
            verdict: 'mixed',
          },
        ],
      },
    ],
  },
  {
    id: 'mars_drill',
    missionId: 'mars',
    index: 2,
    title: 'Dust Storm and Drill Stall',
    alert: 'POWER / PAYLOAD — DRILL STALLED AT 4 CM',
    room: 'lab',
    description:
      'A regional dust storm has dimmed the sky and the drill has stalled in ice-cemented ground. Breaking through needs heat and sustained full power.',
    situation: [
      {
        id: 'mars_c3_dust',
        when: [{ stat: 'solar', gte: 1 }],
        effects: [{ kind: 'powerGen', pct: -40 }],
        title: 'Dust storm dims the arrays',
        narrative: 'Airborne dust and dust settling on the panels cut solar output by 40%.',
        severity: 'warn',
      },
      {
        id: 'mars_c3_rtg',
        when: [{ stat: 'solar', lt: 1 }],
        effects: [],
        title: 'RTG unaffected by the storm',
        narrative: 'The radioisotope generator does not need sunlight. Power output is unchanged.',
        severity: 'good',
      },
      {
        id: 'mars_c3_raddamage',
        when: [{ flag: 'rad_damage' }],
        effects: [{ kind: 'science', pct: -10 }],
        title: 'Corrupted fault tables interrupt drilling',
        narrative: 'Fault-protection limits corrupted in the solar storm keep tripping the drill early. Each restart costs sampling time.',
        severity: 'warn',
      },
    ],
    options: [
      {
        id: 'A',
        label: 'Shallow Sampling in Low-Power Mode',
        summary: 'Back the drill out and collect surface samples at reduced power.',
        pros: ['Power demand drops by 25%', 'No risk to the drill or the battery'],
        cons: ['Shallow samples only: science reduced 30%'],
        advisories: [
          { when: [{ stat: 'powerMarginPct', lt: 0 }, { stat: 'backupHours', lt: 30 }], level: 'good', text: 'POWER: stored energy cannot support deep drilling. Low-power mode is the safe call.' },
          { when: [{ stat: 'powerMarginPct', gte: 0 }], level: 'warn', text: 'POWER: generation still covers the full load. You may be giving up the deep samples unnecessarily.' },
        ],
        branches: [
          {
            effects: [
              { kind: 'powerDraw', pct: -25 },
              { kind: 'science', pct: -30 },
              { kind: 'flag', flag: 'shallow_only' },
            ],
            title: 'Shallow samples cached',
            narrative: 'The drill collected weathered surface material. The samples are useful, but not the ancient mud the mission came for.',
            verdict: 'mixed',
          },
        ],
      },
      {
        id: 'B',
        label: 'Heat and Hammer — Full-Power Deep Drilling',
        summary: 'Run the bit heaters and percussion at full power to break through the ice.',
        pros: ['Deep, pristine samples: science +10%'],
        cons: ['Needs 30 hours of full power over three sols', 'A brown-out can freeze the bit in the hole'],
        advisories: [
          { when: [{ stat: 'powerMarginPct', gte: 0 }], level: 'good', text: 'POWER: generation covers full-power drilling.' },
          { when: [{ stat: 'powerMarginPct', lt: 0 }, { stat: 'backupHours', gte: 30 }], level: 'good', text: 'POWER: the battery can cover the deficit for the 30 hours of drilling.' },
          { when: [{ stat: 'powerMarginPct', lt: 0 }, { stat: 'backupHours', lt: 30 }], level: 'crit', text: 'POWER: stored energy cannot sustain 30 hours of drilling. Expect a brown-out with the bit in the hole.' },
        ],
        lockedWhen: {
          when: [{ flag: 'hard_landing' }],
          reason: 'The drill mast was bent in the hard landing — deep drilling is not possible.',
        },
        branches: [
          {
            when: [{ stat: 'powerMarginPct', gte: 0 }],
            effects: [
              { kind: 'battery', pctOfCapacity: -10 },
              { kind: 'science', pct: 10 },
              { kind: 'flag', flag: 'deep_samples' },
            ],
            title: 'Breakthrough — deep samples cached',
            narrative: 'With power to spare, the heated bit punched through the ice layer. Three sealed tubes of ancient delta mud are in the cache.',
            verdict: 'good',
          },
          {
            when: [{ stat: 'backupHours', gte: 30 }],
            effects: [
              { kind: 'battery', pctOfCapacity: -45 },
              { kind: 'debt', debt: 'power', amount: 10 },
              { kind: 'science', pct: 10 },
              { kind: 'flag', flag: 'deep_samples' },
            ],
            title: 'Breakthrough on battery power',
            narrative: 'The battery carried the drill through the ice layer. Deep samples are cached and the energy reserve is low.',
            verdict: 'good',
          },
          {
            effects: [
              { kind: 'battery', pctOfCapacity: -100 },
              { kind: 'oxygen', amount: -25 },
              { kind: 'science', pct: -40 },
              { kind: 'debt', debt: 'power', amount: 30 },
              { kind: 'health', system: 'computer', amount: -20 },
              { kind: 'health', system: 'science', amount: -30 },
              { kind: 'flag', flag: 'brownout' },
            ],
            title: 'Brown-out — drill bit frozen in the hole',
            narrative: 'The battery ran flat on the second sol. Heaters cut out, meltwater refroze around the bit and the drill is stuck fast.',
            verdict: 'bad',
          },
        ],
      },
    ],
  },
];

export function challengesForMission(missionId: string): Challenge[] {
  return CHALLENGES.filter((c) => c.missionId === missionId).sort((a, b) => a.index - b.index);
}
