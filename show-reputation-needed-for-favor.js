import { repNeededForFavor } from './utils/faction.js';

/**
 * Script to display the reputation required to reach a specific favor target.
 * 
 * Usage: run show-reputation-favor.js [startingFavor] [targetFavor]
 * 
 * @param {NS} ns - Netscript object provided by Bitburner.
 */
export async function main(ns) {
    const startingFavor = ns.args[0];
    const targetFavor = ns.args[1];

    if (!startingFavor || startingFavor < 0) {
        ns.tprint('ERROR: Please provide a valid starting favor value 0 or greater.');
        return;
    }

    if (!targetFavor || targetFavor <= 0) {
        ns.tprint('ERROR: Please provide a valid target favor value greater than 0.');
        return;
    }

    const existingReputation = repNeededForFavor(startingFavor);
    const targetReputation = repNeededForFavor(targetFavor);
    const requiredReputation = targetReputation - existingReputation;

    ns.tprint(`INFO: To reach ${targetFavor} favor from ${startingFavor}, you need a total of ${requiredReputation.toFixed()} reputation (you already have ${existingReputation.toFixed()} existing reputation).`);
}