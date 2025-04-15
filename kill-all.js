import { getAllServers } from "utils/server.js";

/** @param {NS} ns */
export async function main(ns) {
    const servers = getAllServers(ns);
    const otherServers = servers.filter(server => server !== "home");

    for (const server of otherServers) {
        ns.killall(server);
    }

    ns.killall("home");
    ns.tprint('All scripts have been killed on all servers.');
}