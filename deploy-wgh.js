import { getAllServers, hackServer, getServerAvailableRam, calculateRequiredThreads, getServerScores } from "./utils/server-utils.js";
import { getRunningAttacks } from "./utils/attack-utils.js";

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
    const allServers = getAllServers(ns);
    
    while (true) {
        // Get all servers that could be potential targets
        const potentialTargets = allServers.filter(server => {
            // Only use our own servers
            if (usePurchasedServersOnly && !server.startsWith("pserv-") && server !== "home") return false;

            // Only use hacked servers not our own
            if (useHackedServersOnly && (server.startsWith("pserv-") || server === "home")) return false;

            return ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel();
        });

        // Get running attacks to avoid targeting servers already being attacked
        const runningAttacks = getRunningAttacks(ns, allServers);
        
        // Get server scores and filter out servers under attack
        const serverScores = getServerScores(ns, potentialTargets)
            .filter(server => !runningAttacks.has(server.server))
            .sort((a, b) => b.score - a.score);

        if (serverScores.length === 0) {
            ns.tprint("No suitable targets found. Waiting 60 seconds before retrying...");
            await ns.sleep(60000);
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
        const hackTime = ns.getHackTime(target);

        if (verbose){
            ns.tprint(`\nSelected target: ${target}`);
            ns.tprint(`Score: ${serverScores[0].score.toFixed(2)}`);
            ns.tprint(`Max Money: $${ns.formatNumber(serverScores[0].maxMoney)}`);
            ns.tprint(`Min Security: ${serverScores[0].minSecurity.toFixed(2)}`);
            ns.tprint(`Time to Attack: ${(serverScores[0].timeToAttack / 1000).toFixed(1)}s`);
            ns.tprint(`\nRequired threads for ${target}:`);
            ns.tprint(`Hack: ${requiredThreads.hack}`);
            ns.tprint(`Grow: ${requiredThreads.grow}`);
            ns.tprint(`Weaken: ${requiredThreads.weaken}`);
        }
        
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

                    if (verbose) {
                        ns.tprint(`Deployed ${weakenThreads} weaken threads to ${server} (${remainingRam}GB RAM available)`);
                    }
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

                    if (verbose){
                        ns.tprint(`Deployed ${growThreads} grow threads to ${server} (${remainingRam}GB RAM available)`);
                    }   
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
                    remainingRam -= growThreads * scriptRams.grow;

                    if (verbose){
                        ns.tprint(`Deployed ${hackThreads} hack threads to ${server} (${remainingRam}GB RAM available)`);
                    }
                }   
            }

            await ns.sleep(50);
        }
        
        if (verbose){
            ns.tprint("\nDeployment Summary:");
            ns.tprint(`Total hack threads deployed: ${totalDeployed.hack}/${requiredThreads.hack}`);
            ns.tprint(`Total grow threads deployed: ${totalDeployed.grow}/${requiredThreads.grow}`);
            ns.tprint(`Total weaken threads deployed: ${totalDeployed.weaken}/${requiredThreads.weaken}`);
        
            if (Object.values(remainingThreads).some(threads => threads > 0)) {
                ns.tprint("WARNING: Not all required threads could be deployed due to RAM limitations");
            }
        }

        // Small delay between target selections to prevent overwhelming the system
        await ns.sleep(1000);
    }
} 