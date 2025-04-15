import { getDeployableServers, getAvailableRam } from "./utils/server.js";
import { log } from "./utils/console.js";

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    return ["--verbose", "--loop", "--max-ram"];
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    const sleepTime = 30000;
    const verbose = ns.args.includes("--verbose");
    const loop = ns.args.includes("--loop");

    // Parse --max-ram argument (default to 80% if not provided)
    const maxRamToShareArg = ns.args.find(arg => arg.startsWith("--max-ram="));
    const maxRamToShare = maxRamToShareArg ? parseFloat(maxRamToShareArg.split("=")[1]) / 100 : 0.8;

    if (isNaN(maxRamToShare) || maxRamToShare <= 0 || maxRamToShare > 1) {
        ns.tprint("ERROR: Invalid value for --max-ram. Please provide a percentage between 1 and 100.");
        return;
    }

    const scriptRam = ns.getScriptRam("share.js");
    
    do {
        // Get all deployable servers and sort them by max RAM (ascending)
        const deployServers = getDeployableServers(ns, "", true, false)
            .filter(server => server !== "home")
            .sort((a, b) => ns.getServerMaxRam(a) - ns.getServerMaxRam(b));

        log(ns, "\n=== RAM Sharing Setup ===", verbose);
        log(ns, `Found ${deployServers.length} deployable servers`, verbose);
        log(ns, `Max RAM to share: ${(maxRamToShare * 100).toFixed(2)}%`, verbose);

        // Copy the share script to all servers
        for (const server of deployServers) {
            await ns.scp("share.js", server);
        }

        // Calculate total RAM stats
        let totalMaxRam = 0;
        let totalUsedRam = 0;

        for (const server of deployServers) {
            totalMaxRam += ns.getServerMaxRam(server);
            totalUsedRam += ns.getServerUsedRam(server);
        }

        log(ns, `Total RAM: [max: ${totalMaxRam}GB] [used: ${totalUsedRam.toFixed(2)}GB] [usage: ${(totalUsedRam / totalMaxRam * 100).toFixed(2)}%]`, verbose);

        if (totalUsedRam / totalMaxRam > maxRamToShare) {
            log(ns, `RAM usage is above ${(maxRamToShare * 100).toFixed(2)}%. Waiting ${sleepTime / 1000} seconds....`, verbose);
            await ns.sleep(sleepTime);
            continue;
        }

        // Calculate and deploy threads
        let threadsDeployed = 0;
        let threadsToDeploy = Math.floor((totalMaxRam * maxRamToShare - totalUsedRam) / scriptRam); // maxRamToShare of max RAM minus used RAM

        for (const server of deployServers) {
            const availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
            const threads = Math.min(Math.floor(availableRam / scriptRam), threadsToDeploy);

            if (threads <= 0) {
                continue;
            }

            threadsToDeploy -= threads;
            threadsDeployed += threads;

            //log(ns, `${server}: [deployed ${threads} share threads]`, verbose);
            ns.exec("share.js", server, threads);

            if (threadsToDeploy <= 0) {
                break;
            }
        }

        log(ns, `Total Threads Allocated: ${threadsDeployed}`, verbose);

        if (loop) {
            log(ns, "\nChecking again in 30 seconds...", verbose);
            await ns.sleep(sleepTime);
        }
    } while (loop);
}