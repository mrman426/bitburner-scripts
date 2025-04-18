import { getAllServers, hackServer } from "./utils/server.js";
import { log } from "./utils/console.js";

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    if (args.length === 1) return data.servers;
    return ["--loop"];
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    const loop = ns.args.includes("--loop");

    do {
        getAllServers(ns)
            .filter(server => {
                return (server !== "home" && !server.startsWith("pserv-"));
            })
            .forEach(server => {
                if (hackServer(ns, server)) {
                    log(ns, `Gained root access on ${server}`, true);
                }
            });

        if (loop) {
            await ns.sleep(10000);
        }
    } while (loop);
}