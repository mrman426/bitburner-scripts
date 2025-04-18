import { getAllServers, getDeployServers, getServerAvailableRam, calculateRequiredThreads, getRunningPrograms, getTargetServers } from "./utils/server.js";
import { log } from "./utils/console.js";

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    return ["--purchased-only", "--hacked-only", "--verbose", "--verbose-hacked", "--loop"];
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    const verbose = ns.args.includes("--verbose");
    const verboseHacked = ns.args.includes("--verbose-hacked");
    const loop = ns.args.includes("--loop");

    // Get script RAM requirements
    const scriptRams = {
        hack: ns.getScriptRam("hack.js"),
        grow: ns.getScriptRam("grow.js"),
        weaken: ns.getScriptRam("weaken.js"),
    };
    
    // Get all servers and filter out those we can't hack
    const usePurchasedServersOnly = ns.args.includes("--purchased-only");
    const useHackedServersOnly = ns.args.includes("--hacked-only");
    
    do {
        const allServers = getAllServers(ns);
        const deployServers = getDeployServers(ns, allServers, true, usePurchasedServersOnly, useHackedServersOnly);

        // Get all servers that could be potential targets
        const potentialTargets = allServers.filter(server => {
            if (ns.getServerMaxMoney(server) <= 0) return false;
            return ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel();
        });

        // Get running attacks to avoid targeting servers already being attacked
        const runningAttacks = getRunningPrograms(ns, allServers, ["attack.js", "hack.js", "grow.js", "weaken.js"]);
        
        // Get server scores and filter out servers under attack
        const targetServers = getTargetServers(ns, potentialTargets)
            .filter(server => !runningAttacks.has(server))
            .sort((a, b) => ns.getWeakenTime(a) - ns.getWeakenTime(b));

        if (targetServers.length === 0) {
            log(ns, "WARNING: No suitable targets found. Waiting 10 seconds before retrying...", verbose);
            await ns.sleep(10000);
            continue;
        }

        const target = targetServers[0];
        const attackTime = ns.getWeakenTime(target);
        const maxMoney = ns.getServerMaxMoney(target);

        // Calculate required threads for each operation
        const requiredThreads = {
            hack: calculateRequiredThreads(ns, target, 'hack'),
            grow: calculateRequiredThreads(ns, target, 'grow'),
            weaken: calculateRequiredThreads(ns, target, 'weaken'),
            growWeaken: calculateRequiredThreads(ns, target, 'growWeaken'),
        };

        // Calculate timing for operations
        const weakenTime = ns.getWeakenTime(target);
        const growTime = ns.getGrowTime(target);
        const hackTime = ns.getHackTime(target);
        const hackWaitTime = weakenTime - hackTime - 500;
        const weakenWaitTime = 0;
        const growWaitTime = weakenTime - growTime + 500;
        const growWeakenWaitTime = 1000;

        log(ns, `========================================\nSelected target: ${target} [Max Money: $${ns.formatNumber(maxMoney)}] [Time to Attack: ${(attackTime / 1000).toFixed(1)}s]`, verbose);
        log(ns, `Required Threads: [Hack: ${requiredThreads.hack}] [Weaken: ${requiredThreads.weaken}] [Grow: ${requiredThreads.grow}] [GrowWeaken: ${requiredThreads.growWeaken}]`, verbose);
        
        // Distribute threads across available servers
        let remainingThreads = { ...requiredThreads };
        let totalDeployed = { hack: 0, grow: 0, weaken: 0, growWeaken: 0 };

        for (const server of deployServers) {
            const serverRam = getServerAvailableRam(ns, server);
            let remainingRam = serverRam;

            // Deploy weaken first
            const weakenThreads = Math.min(remainingThreads.weaken, Math.floor(remainingRam / scriptRams.weaken));
            if (weakenThreads > 0) {
                await ns.scp("utils/data.js", server);
                await ns.scp("weaken.js", server);
                const pid = ns.exec("weaken.js", server, weakenThreads, target, weakenThreads, weakenWaitTime, verbose);
                if (pid > 0) {
                    remainingThreads.weaken -= weakenThreads;
                    totalDeployed.weaken += weakenThreads;
                    remainingRam -= weakenThreads * scriptRams.weaken;
                }
            }

            // Then deploy grow
            const growThreads = Math.min(remainingThreads.grow, Math.floor(remainingRam / scriptRams.grow));
            if (growThreads > 0) {
                await ns.scp("utils/data.js", server);
                await ns.scp("grow.js", server);
                const pid = ns.exec("grow.js", server, growThreads, target, growThreads, growWaitTime, verbose);
                if (pid > 0) {
                    remainingThreads.grow -= growThreads;
                    totalDeployed.grow += growThreads;
                    remainingRam -= growThreads * scriptRams.grow;
                }
            }

            // Then deploy grow weaken
            const growWeakenThreads = Math.min(remainingThreads.growWeaken, Math.floor(remainingRam / scriptRams.weaken));
            if (growWeakenThreads > 0) {
                await ns.scp("utils/data.js", server);
                await ns.scp("weaken.js", server);
                const pid = ns.exec("weaken.js", server, growWeakenThreads, target, growWeakenThreads, growWeakenWaitTime, verbose);
                if (pid > 0) {
                    remainingThreads.growWeaken -= growWeakenThreads;
                    totalDeployed.growWeaken += growWeakenThreads;
                    remainingRam -= growWeakenThreads * scriptRams.weaken;
                }
            }

            // Finally deploy hack with sleep time to wait for weaken and grow
            const hackThreads = Math.min(remainingThreads.hack, Math.floor(remainingRam / scriptRams.hack));
            if (hackThreads > 0) {
                await ns.scp("utils/data.js", server);
                await ns.scp("hack.js", server);
                const pid = ns.exec("hack.js", server, hackThreads, target, hackThreads, hackWaitTime, verbose || verboseHacked);
                if (pid > 0) {
                    remainingThreads.hack -= hackThreads;
                    totalDeployed.hack += hackThreads;
                    remainingRam -= hackThreads * scriptRams.hack;
                }   
            }
        }
        
        log(ns, `Deployed Threads: [Hack: ${totalDeployed.hack}] [Weaken: ${totalDeployed.weaken}] [Grow: ${totalDeployed.grow}] [GrowWeaken: ${totalDeployed.growWeaken}]`, verbose);
    
        if (Object.values(remainingThreads).some(threads => threads > 0)) {
            log(ns, "WARNING: Not all required threads could be deployed due to RAM limitations.", verbose);

            if (loop) {
                log(ns, "INFO: Waiting 10 seconds before retrying...", verbose);
                await ns.sleep(10000);
            }
        }

        if (loop) {
            await ns.sleep(100);
        }
    } while (loop);
} 