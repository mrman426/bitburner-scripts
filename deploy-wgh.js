import { getAllServers, getServerAvailableRam, calculateRequiredThreads, getServerScores, getRunningAttacks, hackServer } from "./utils/server-utils.js";
import { log } from "./utils/console-utils.js";

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    return args.length === 0 ? ["--purchased-only", "--hacked-only", "--verbose", "--verbose-hacked"] : data.servers;
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("disableLog")
    ns.disableLog("sleep")
    ns.disableLog("getServerMaxMoney")
    ns.disableLog("getServerMinSecurityLevel")
    ns.disableLog("getServerMoneyAvailable")
    ns.disableLog("getServerSecurityLevel")
    ns.disableLog("getServerMaxRam")
    ns.disableLog("getServerUsedRam")
    ns.disableLog("getServerGrowth")
    ns.disableLog("getHackingLevel")
    ns.disableLog("getServerRequiredHackingLevel")
    ns.disableLog("scan")
    ns.disableLog("scp")
    ns.disableLog("exec")

    const verbose = ns.args.includes("--verbose");
    const verboseHacked = ns.args.includes("--verbose-hacked");

    // Get script RAM requirements
    const scriptRams = {
        hack: ns.getScriptRam("hack.js"),
        grow: ns.getScriptRam("grow.js"),
        weaken: ns.getScriptRam("weaken.js")
    };
    
    // Get all servers and filter out those we can't hack
    const usePurchasedServersOnly = ns.args.includes("--purchased-only");
    const useHackedServersOnly = ns.args.includes("--hacked-only");
    
    while (true) {
        const allServers = getAllServers(ns);

        // Get all servers that could be potential targets
        const potentialTargets = allServers.filter(server => {
            if (ns.getServerMaxMoney(server) <= 0) return false;
            if (ns.getServerRequiredHackingLevel(server) > ns.getHackingLevel()) return false;

            // Attempt to nuke the server
            hackServer(ns, server)

            return true;
        });

        // Get running attacks to avoid targeting servers already being attacked
        const runningAttacks = getRunningAttacks(ns, allServers);
        
        // Get server scores and filter out servers under attack
        const serverScores = getServerScores(ns, potentialTargets)
            .filter(server => !runningAttacks.has(server.server))
            .sort((a, b) => b.score - a.score);

        if (serverScores.length === 0) {
            log(ns, "No suitable targets found. Waiting 30 seconds before retrying...", verbose);
            await ns.sleep(30000);
            continue;
        }

        const target = serverScores[0].server;

        // Calculate required threads for each operation
        const requiredThreads = {
            hack: calculateRequiredThreads(ns, target, 'hack'),
            grow: calculateRequiredThreads(ns, target, 'grow'),
            weaken: calculateRequiredThreads(ns, target, 'weaken')
        };

        // Calculate timing for operations
        const weakenTime = ns.getWeakenTime(target);
        const growTime = ns.getGrowTime(target);

        log(ns, `========================================\nSelected target: ${target} [Max Money: $${ns.formatNumber(serverScores[0].maxMoney)}] [Time to Attack: ${(serverScores[0].timeToAttack / 1000).toFixed(1)}s]`, verbose);
        log(ns, `Required Threads: [Hack: ${requiredThreads.hack}] [Grow: ${requiredThreads.grow}] [Weaken: ${requiredThreads.weaken}]`, verbose);
        
        // Get deployable servers
        const deployServers = allServers
            .filter(server => {
                if (usePurchasedServersOnly && !server.startsWith("pserv-") && server !== "home") return false;
                if (useHackedServersOnly && (server.startsWith("pserv-") || server === "home")) return false;
                return ns.hasRootAccess(server);
            })
            .sort((a, b) => {
                const ramA = getServerAvailableRam(ns, a);
                const ramB = getServerAvailableRam(ns, b);
                return ramB - ramA;
            });

        // Distribute threads across available servers
        let remainingThreads = { ...requiredThreads };
        let totalDeployed = { hack: 0, grow: 0, weaken: 0 };
        
        for (const server of deployServers) {
            const serverRam = getServerAvailableRam(ns, server);
            let remainingRam = serverRam;
            
            // Deploy weaken first
            const weakenThreads = Math.min(remainingThreads.weaken, Math.floor(remainingRam / scriptRams.weaken));
            if (weakenThreads > 0) {
                await ns.scp("weaken.js", server);
                const pid = ns.exec("weaken.js", server, weakenThreads, target, 0, verbose);
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
                const pid = ns.exec("grow.js", server, growThreads, target, 0, verbose);
                if (pid > 0) {
                    remainingThreads.grow -= growThreads;
                    totalDeployed.grow += growThreads;
                    remainingRam -= growThreads * scriptRams.grow;
                }
            }

            // Finally deploy hack with sleep time to wait for weaken and grow
            const hackThreads = Math.min(remainingThreads.hack, Math.floor(remainingRam / scriptRams.hack));
            if (hackThreads > 0) {
                await ns.scp("hack.js", server);
                const pid = ns.exec("hack.js", server, hackThreads, target, Math.max(weakenTime, growTime), verboseHacked);
                if (pid > 0) {
                    remainingThreads.hack -= hackThreads;
                    totalDeployed.hack += hackThreads;
                    remainingRam -= hackThreads * scriptRams.hack;
                }   
            }

            await ns.sleep(50);
        }
        
        log(ns, `Deployed Threads: [Hack: ${totalDeployed.hack}] [Grow: ${totalDeployed.grow}] [Weaken: ${totalDeployed.weaken}]`, verbose);
    
        if (Object.values(remainingThreads).some(threads => threads > 0)) {
            log(ns, "WARNING: Not all required threads could be deployed due to RAM limitations. Sleeping for 30 seconds.", verbose);
            await ns.sleep(30000);
        }

        // Small delay between target selections to prevent overwhelming the system
        await ns.sleep(1000);
    }
} 