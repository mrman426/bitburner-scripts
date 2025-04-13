import { listView } from "./utils/console.js";

/** @param {NS} ns */
export async function main(ns) {
    // Get all purchased servers
    const purchasedServers = ns.getPurchasedServers();
    
    if (purchasedServers.length === 0) {
        ns.tprint("No purchased servers found.");
        return;
    }

    // Sort servers by name
    purchasedServers.sort();
    
    let totalRam = 0;
    let totalUsedRam = 0;
    let totalCost = 0;
    
    // Prepare data for listView
    const serverData = purchasedServers.map(server => {
        const maxRam = ns.getServerMaxRam(server);
        const usedRam = ns.getServerUsedRam(server);
        const cost = ns.getPurchasedServerCost(maxRam);
        
        // Update totals
        totalRam += maxRam;
        totalUsedRam += usedRam;
        totalCost += cost;
        
        return {
            "Server Name": server,
            "RAM": `${maxRam}GB`,
            "Used RAM": `${usedRam.toFixed(2)}GB`,
            "Cost": `$${ns.formatNumber(cost)}`
        };
    });
    
    // Print header and formatted table
    ns.tprint("\n=== Purchased Servers ===\n" + listView(serverData));
} 