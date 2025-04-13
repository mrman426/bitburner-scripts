import { getAvailableRam } from "./utils/server.js";
import { listView } from "./utils/console.js";

/** @param {NS} ns */
export async function main(ns) {
    const purchasedServers = ns.getPurchasedServers();
    
    if (purchasedServers.length === 0) {
        ns.tprint("No purchased servers found.");
        return;
    }

    const serverData = purchasedServers
        .sort((a, b) => ns.getServerMaxRam(b) - ns.getServerMaxRam(a))
        .map(server => {
            const maxRam = ns.getServerMaxRam(server);
            return {
                "Server Name": server,
                "RAM": `${maxRam}GB`,
                "Free RAM": `${getAvailableRam(ns, server).toFixed(2)}GB`,
                "Cost": `$${ns.formatNumber(ns.getPurchasedServerCost(maxRam))}`
            };
        });
    
    ns.tprint("\n=== Purchased Servers ===\n" + listView(serverData));
} 