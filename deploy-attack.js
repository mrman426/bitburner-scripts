import { getAllServers, hackServer, getServerAvailableRam } from "./utils/server-utils.js";
import { log } from "./utils/console-utils.js";

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    return args.length === 0 ? ["--purchased-only", "--hacked-only", "--verbose"] : data.servers;
}

/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];
    if (!target) {
        ns.tprint("ERROR: No target specified");
        return;
    }

    const verbose = ns.args.includes("--verbose");
    const verboseHacked = ns.args.includes("--verbose-hacked");

    const scriptRam = ns.getScriptRam("attack.js");
    
    // Get all servers and filter out those we can't hack
    const usePurchasedServersOnly = ns.args.includes("--purchased-only");
    const useHackedServersOnly = ns.args.includes("--hacked-only");
    const allServers = getAllServers(ns);
    const hackableServers = allServers.filter(server => {
        const requiredHackingLevel = ns.getServerRequiredHackingLevel(server);

        // Only use our own servers
        if (usePurchasedServersOnly && !server.startsWith("pserv-") && server !== "home") return false;

        // Only use hacked servers not our own
        if (useHackedServersOnly && (server.startsWith("pserv-") || server === "home")) return false;

        return requiredHackingLevel <= ns.getHackingLevel();
    });
    
    for (const server of hackableServers) {
        // Try to nuke the server
        hackServer(ns, server)
        
        // If we have root access, deploy the script
        if (ns.hasRootAccess(server)) {
            // Copy the script
            await ns.scp("attack.js", server);
            
            // Calculate how many threads we can run
            const serverRam = getServerAvailableRam(ns, server);
            const threads = Math.floor(serverRam / scriptRam);
            
            if (threads > 0) {
                log(ns, `Running ${threads} threads on ${server}`, verbose);
                ns.exec("attack.js", server, threads, target);
                await ns.sleep(500);
            }
        }
    }
    
    log(ns, "Deployment complete!", verbose);
} 