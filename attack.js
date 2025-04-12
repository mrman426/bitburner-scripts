/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, flags) {
	return data.servers;
}

/** @param {NS} ns */
/** @param {string} target */
export async function main(ns) {
    const target = ns.args[0];
    const shouldLoop = ns.args[1] !== false;
    const weakenThreads = ns.args[2] || 0;
    const growThreads = ns.args[3] || 0;
    const hackThreads = ns.args[4] || 0;
    
    if (!target) {
        ns.tprint("ERROR: No target specified");
        return;
    }

    // Get server information
    const maxMoney = ns.getServerMaxMoney(target);
    const currentMoney = ns.getServerMoneyAvailable(target);
    const currentSecurity = ns.getServerSecurityLevel(target);
    const minSecurity = ns.getServerMinSecurityLevel(target);
    
    // If security is too high and we have weaken threads, weaken it
    if (currentSecurity > minSecurity + 1 && weakenThreads > 0) {
        ns.tprint(`Security too high (${currentSecurity.toFixed(2)} > ${(minSecurity + 1).toFixed(2)}), weakening...`);
        await ns.weaken(target, { threads: weakenThreads });
    }
    
    // If money is too low and we have grow threads, grow it
    if (currentMoney < maxMoney * 0.5 && growThreads > 0) {
        ns.tprint(`Money too low (${ns.formatNumber(currentMoney)} < ${ns.formatNumber(maxMoney * 0.5)}), growing...`);
        await ns.grow(target, { threads: growThreads });
    }
    
    // If we have hack threads, perform the hack
    if (hackThreads > 0) {
        ns.tprint(`Hacking ${target}...`);
        const stolen = await ns.hack(target, { threads: hackThreads });
        ns.tprint(`Stole ${ns.formatNumber(stolen)} from ${target}`);
    }
    
    // If looping is enabled, continue
    if (shouldLoop) {
        do {
            const currentMoney = ns.getServerMoneyAvailable(target);
            const currentSecurity = ns.getServerSecurityLevel(target);
            
            if (currentSecurity > minSecurity + 1 && weakenThreads > 0) {
                await ns.weaken(target, { threads: weakenThreads });
            } else if (currentMoney < maxMoney * 0.5 && growThreads > 0) {
                await ns.grow(target, { threads: growThreads });
            } else if (hackThreads > 0) {
                await ns.hack(target, { threads: hackThreads });
            }
        } while (shouldLoop);
    }
} 