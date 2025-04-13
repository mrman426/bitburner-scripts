import { getAllServers, hackServer, getServerAvailableRam, calculateRequiredThreads } from "./utils/server-utils.js";

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    return args.length === 0 ? ["--purchased-only", "--hacked-only"] : data.servers;
}

/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];
    if (!target) {
        ns.tprint("ERROR: No target specified");
        return;
    }

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
    const deployServers = allServers
        .filter(server => {
            // Only use our own servers
            if (usePurchasedServersOnly && !server.startsWith("pserv-") && server !== "home") return false;

            // Only use hacked servers not our own
            if (useHackedServersOnly && (server.startsWith("pserv-") || server === "home")) return false;

            return ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel();
        })
        .sort((a, b) => {
            const ramA = getServerAvailableRam(ns, a);
            const ramB = getServerAvailableRam(ns, b);
            return ramB - ramA;
        });

    // Calculate required threads for each operation
    const requiredThreads = {
        hack: calculateRequiredThreads(ns, target, 'hack'),
        grow: calculateRequiredThreads(ns, target, 'grow'),
        weaken: calculateRequiredThreads(ns, target, 'weaken')
    };

    ns.tprint(`\nRequired threads for ${target}:`);
    ns.tprint(`Hack: ${requiredThreads.hack}`);
    ns.tprint(`Grow: ${requiredThreads.grow}`);
    ns.tprint(`Weaken: ${requiredThreads.weaken}`);
    
    // Distribute threads across available servers
    let remainingThreads = { ...requiredThreads };
    let totalDeployed = { hack: 0, grow: 0, weaken: 0 };
    
    for (const server of deployServers) {
        // Try to nuke the server if needed
        if (!ns.hasRootAccess(server)) {
            ns.tprint(`Attempting to gain root access on ${server}...`);
            if (hackServer(ns, server)) {
                ns.tprint(`Successfully gained root access on ${server}`);
            } else {
                ns.tprint(`Not enough ports opened for ${server}. Need ${ns.getServerNumPortsRequired(server)} but only opened ${portsOpened}`);
                continue;
            }
        }
        
        // If we have root access, deploy the scripts
        if (ns.hasRootAccess(server)) {
            const serverRam = getServerAvailableRam(ns, server);
            let remainingRam = serverRam;
            
            // Deploy weaken first
            const weakenThreads = Math.min(remainingThreads.weaken, Math.floor(remainingRam / scriptRams.weaken));
            if (weakenThreads > 0) {
                await ns.scp("weaken.js", server);
                const pid = ns.exec("weaken.js", server, weakenThreads, target);
                if (pid > 0) {
                    remainingThreads.weaken -= weakenThreads;
                    totalDeployed.weaken += weakenThreads;
                    ns.tprint(`Deployed ${weakenThreads} weaken threads to ${server} (${remainingRam}GB RAM available)`);
                    remainingRam -= weakenThreads * scriptRams.weaken;
                }
            }

            // Then deploy grow
            const growThreads = Math.min(remainingThreads.grow, Math.floor(remainingRam / scriptRams.grow));
            if (growThreads > 0) {
                await ns.scp("grow.js", server);
                const pid = ns.exec("grow.js", server, growThreads, target);
                if (pid > 0) {
                    remainingThreads.grow -= growThreads;
                    totalDeployed.grow += growThreads;
                    ns.tprint(`Deployed ${growThreads} grow threads to ${server} (${remainingRam}GB RAM available)`);
                    remainingRam -= growThreads * scriptRams.grow;
                }
            }

            // Finally deploy hack
            const hackThreads = Math.min(remainingThreads.hack, Math.floor(remainingRam / scriptRams.hack));
            if (hackThreads > 0) {
                await ns.scp("hack.js", server);
                const pid = ns.exec("hack.js", server, hackThreads, target);
                if (pid > 0) {
                    remainingThreads.hack -= hackThreads;
                    totalDeployed.hack += hackThreads;
                    ns.tprint(`Deployed ${hackThreads} hack threads to ${server} (${remainingRam}GB RAM available)`);
                }
            }

            await ns.sleep(500);
        }
    }
    
    ns.tprint("\nDeployment Summary:");
    ns.tprint(`Total hack threads deployed: ${totalDeployed.hack}/${requiredThreads.hack}`);
    ns.tprint(`Total grow threads deployed: ${totalDeployed.grow}/${requiredThreads.grow}`);
    ns.tprint(`Total weaken threads deployed: ${totalDeployed.weaken}/${requiredThreads.weaken}`);
    
    if (Object.values(remainingThreads).some(threads => threads > 0)) {
        ns.tprint("\nWARNING: Not all required threads could be deployed due to RAM limitations");
    }
} 