import { repNeededForFavor } from './utils/faction.js';

/**
 * Script to display the reputation required to reach a specific favor target.
 * 
 * Usage: run show-reputation-favor.js [number]
 * 
 * @param {NS} ns - Netscript object provided by Bitburner.
 */
export async function main(ns) {
    const targetFavor = ns.args[0];

    if (!targetFavor || targetFavor <= 0) {
        ns.tprint('ERROR: Please provide a valid target favor value greater than 0.');
        return;
    }

    const requiredReputation = repNeededForFavor(targetFavor);
    ns.tprint(`INFO: To reach ${targetFavor} favor, you need a total of ${requiredReputation.toFixed(2)} reputation.`);
}