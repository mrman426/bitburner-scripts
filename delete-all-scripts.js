import { getAllServers } from "utils/server.js";

/** @param {NS} ns */
export async function main(ns) {
    const servers = getAllServers(ns);

    for (const server of servers) {
        const files = ns.ls(server, ".js");

        if (files.length === 0) {
            ns.tprint(`INFO: No scripts found on ${server} to delete.`);
            continue;
        }

        for (const file of files) {
            const success = ns.rm(file, server);
            if (success) {
                ns.tprint(`SUCCESS: Deleted ${file} from ${server}`);
            } else {
                ns.tprint(`ERROR: Failed to delete ${file} from ${server}`);
            }
        }

        ns.tprint(`INFO: Finished deleting scripts on ${server}.`);
    }

    ns.tprint("INFO: Finished deleting scripts on all servers.");
}