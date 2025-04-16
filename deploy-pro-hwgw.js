import { getAllServers, getDeployServers, getServerAvailableRam, calculateAttackThreads, hackServer } from "./utils/server.js";
import { log } from "./utils/console.js";

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    if (args.length === 1) return data.servers;
    return ["--purchased-only", "--hacked-only", "--verbose", "--verbose-hacked", "--loop"];
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    const target = ns.args[0];
    if (!target) {
        ns.tprint("ERROR: No target specified");
        return;
    }

    const loop = ns.args.includes("--loop");
    const verbose = ns.args.includes("--verbose");
    const verboseHacked = verbose || ns.args.includes("--verbose-hacked");

    // Get script RAM requirements
    const scriptRams = {
        hack: ns.getScriptRam("hack.js"),
        grow: ns.getScriptRam("grow.js"),
        weaken: ns.getScriptRam("weaken.js")
    };
    
    // Get all servers and filter out those we can't hack
    const usePurchasedServersOnly = ns.args.includes("--purchased-only");
    const useHackedServersOnly = ns.args.includes("--hacked-only");
    
    // Calculate required threads for each operation
    const requiredThreads = calculateAttackThreads(ns, target, 0.25)

    // Calculate timing for operations
    const weakenTime = ns.getWeakenTime(target);
    const growTime = ns.getGrowTime(target);
    const hackTime = ns.getHackTime(target);
    const hackWaitTime = weakenTime - hackTime;
    const weakenWaitTime = 100;
    const growWaitTime = weakenTime - growTime + 200;
    const growWeakenWaitTime = 300;

    log(ns, `========================================\nSelected target: ${target} [Max Money: $${ns.formatNumber(ns.getServerMaxMoney(target))}] [Time to Attack: ${(ns.getWeakenTime(target) / 1000).toFixed(1)}s]`, verbose);
    log(ns, `Required Threads: [Hack: ${requiredThreads.hack}] [Weaken: ${requiredThreads.weaken}] [Grow: ${requiredThreads.grow}] [GrowWeaken: ${requiredThreads.growWeaken}]`, verbose);

    //const attackTimes = Math.floor(weakenTime * 0.9 / 1000);
    //for (let i=0; i < attackTimes; i++) {
    do {
        const allServers = getAllServers(ns);
        const deployServers = getDeployServers(ns, allServers, true, usePurchasedServersOnly, useHackedServersOnly);

        // Distribute threads across available servers
        let remainingThreads = { ...requiredThreads };
        let totalDeployed = { hack: 0, grow: 0, growWeaken: 0, weaken: 0 };
    
        for (const server of deployServers) {
            const serverRam = getServerAvailableRam(ns, server);
            let remainingRam = serverRam;
            
            // Deploy weaken first
            const weakenThreads = Math.min(remainingThreads.weaken, Math.floor(remainingRam / scriptRams.weaken));
            if (weakenThreads > 0) {
                await ns.scp("weaken.js", server);
                const pid = ns.exec("weaken.js", server, weakenThreads, target, weakenWaitTime, verbose);
                if (pid > 0) {
                    remainingThreads.weaken -= weakenThreads;
                    totalDeployed.weaken += weakenThreads;
                    remainingRam -= weakenThreads * scriptRams.weaken;
                }
            }

            // Then deploy grow
            const growThreads = Math.min(remainingThreads.grow, Math.floor(remainingRam / scriptRams.grow));
            if (growThreads > 0) {
                await ns.scp("grow.js", server);
                const pid = ns.exec("grow.js", server, growThreads, target, growWaitTime, verbose);
                if (pid > 0) {
                    remainingThreads.grow -= growThreads;
                    totalDeployed.grow += growThreads;
                    remainingRam -= growThreads * scriptRams.grow;
                }
            }

            // Then deploy growWeaken
            const growWeakenThreads = Math.min(remainingThreads.growWeaken, Math.floor(remainingRam / scriptRams.weaken));
            if (growWeakenThreads > 0) {
                await ns.scp("weaken.js", server);
                const pid = ns.exec("weaken.js", server, growWeakenThreads, target, growWeakenWaitTime, verbose);
                if (pid > 0) {
                    remainingThreads.growWeaken -= growWeakenThreads;
                    totalDeployed.growWeaken += growWeakenThreads;
                    remainingRam -= growWeakenThreads * scriptRams.weaken;
                }
            }

            // Finally deploy hack
            const hackThreads = Math.min(remainingThreads.hack, Math.floor(remainingRam / scriptRams.hack));
            if (hackThreads > 0) {
                await ns.scp("hack.js", server);
                const pid = ns.exec("hack.js", server, hackThreads, target, hackWaitTime, verboseHacked);
                if (pid > 0) {
                    remainingThreads.hack -= hackThreads;
                    totalDeployed.hack += hackThreads;
                    remainingRam -= hackThreads * scriptRams.hack;
                }   
            }
        }

        log(ns, `Deployed Threads: [Hack: ${totalDeployed.hack}] [Weaken: ${totalDeployed.weaken}] [Grow: ${totalDeployed.grow}] [GrowWeaken: ${totalDeployed.growWeaken}]`, verbose);
        await ns.sleep(2000);

        if (Object.values(remainingThreads).some(threads => threads > 0)) {
            log(ns, "WARNING: Not all required threads could be deployed due to RAM limitations. Waiting 30 seconds before retrying...", verbose);
            await ns.sleep(30000);
            continue;
        }
    } while (loop);
} 