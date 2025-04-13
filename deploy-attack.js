import { getAllServers, hackServer, getServerAvailableRam } from "./utils/server-utils.js";

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, flags) {
	return data.servers;
}

/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];
    if (!target) {
        ns.tprint("ERROR: No target specified");
        return;
    }

    const scriptRam = ns.getScriptRam("attack.js");
    
    // Get all servers and filter out those we can't hack
    const allServers = getAllServers(ns);
    const hackableServers = allServers.filter(server => {
        const requiredHackingLevel = ns.getServerRequiredHackingLevel(server);
        return requiredHackingLevel <= ns.getHackingLevel();
    });
    
    for (const server of hackableServers) {
        // Try to nuke the server
        if (!ns.hasRootAccess(server)) {
            ns.tprint(`Attempting to gain root access on ${server}...`);
            if (hackServer(ns, server)) {
                ns.tprint(`Successfully gained root access on ${server}`);
            } else {
                ns.tprint(`Not enough ports opened for ${server}. Need ${ns.getServerNumPortsRequired(server)} but only opened ${portsOpened}`);
            }
        }
        
        // If we have root access, deploy the script
        if (ns.hasRootAccess(server)) {
            // Copy the script
            await ns.scp("attack.js", server);
            
            // Calculate how many threads we can run
            const serverRam = getServerAvailableRam(ns, server);
            const threads = Math.floor(serverRam / scriptRam);
            
            if (threads > 0) {
                ns.tprint(`Running ${threads} threads on ${server}`);
                ns.exec("attack.js", server, threads, target);
                await ns.sleep(250);
            }
        }
    }
    
    ns.tprint("Deployment complete!");
} 