import { getAvailableRam } from "./utils/server.js";
import { formatRam, formatMoney, formatPercent, listView, detailView } from "./utils/console.js";

/** @param {NS} ns */
export async function main(ns) {
    const purchasedServers = ns.getPurchasedServers();
    
    if (purchasedServers.length === 0) {
        ns.tprint("No purchased servers found.");
        return;
    }

    let totalMaxRam = 0;
    let totalUsedRam = 0;
    let totalCost = 0;

    const serverData = purchasedServers
        .sort((a, b) => ns.getServerMaxRam(b) - ns.getServerMaxRam(a))
        .map(server => {
            const maxRam = ns.getServerMaxRam(server);
            const availableRam = getAvailableRam(ns, server);
            const usedRam = maxRam - availableRam;
            const cost = ns.getPurchasedServerCost(maxRam);

            totalMaxRam += maxRam;
            totalUsedRam += usedRam;
            totalCost += cost;

            return {
                "Server Name": server,
                "RAM": `${formatRam(ns, maxRam)}`,
                "RAM Usage": `${formatPercent(ns, 1 - (availableRam / maxRam))}`,
                "Cost": `${formatMoney(ns, cost)}`
            };
        });

    const totals = {
        "Total RAM": formatRam(ns, totalMaxRam),
        "Total Used RAM": formatRam(ns, totalUsedRam),
        "Total Free RAM": formatRam(ns, totalMaxRam - totalUsedRam),
        "Total RAM Usage": formatPercent(ns, totalUsedRam / totalMaxRam),
        "Total Cost": formatMoney(ns, totalCost)
    };

    ns.tprint("\n=== Purchased Servers ===\n" + listView(serverData) + detailView(totals));
}