import { getDeployServers, getServerAvailableRam, getRunningPrograms, getAllServers } from "./utils/server.js";
import { log } from "./utils/console.js";

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    if (args.length === 1) return data.servers;
    return ["--purchased-only", "--hacked-only", "--verbose", "--loop"];
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
    const scriptRam = ns.getScriptRam("attack.js");
    const usePurchasedServersOnly = ns.args.includes("--purchased-only");
    const useHackedServersOnly = ns.args.includes("--hacked-only");
    const maxThreads = 150;

    do {
        let totalThreads = 0;

        // Get currently running threads on all servers
        const allServers = getAllServers(ns);
        const deployServers = getDeployServers(ns, allServers, false, usePurchasedServersOnly, useHackedServersOnly)
            .sort((a, b) => { return getServerAvailableRam(ns, a) - getServerAvailableRam(ns, b); });

        const runningPrograms = getRunningPrograms(ns, allServers, ["attack.js"]);
        const runningThreads = runningPrograms.get(target)?.threads || 0;

        totalThreads += runningThreads;

        for (const server of deployServers) {
            if (totalThreads >= maxThreads) {
                log(ns, `Max threads (${maxThreads}) reached. Exiting.`, verbose);
                return;
            }

            // Calculate how many threads we can run
            const serverRam = getServerAvailableRam(ns, server);
            const threads = Math.min(Math.floor(serverRam / scriptRam), maxThreads - totalThreads);

            // Run the attack script if we have enough RAM
            if (threads > 0) {
                log(ns, `Running ${threads} threads on ${server}`, verbose);
                await ns.scp("attack.js", server);
                ns.exec("attack.js", server, threads, target);
                totalThreads += threads;
                await ns.sleep(500);
            }
        }

        if (loop) {
            await ns.sleep(500);
        }
    } while (loop);
}