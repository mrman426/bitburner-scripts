/** @param {NS} ns */
export async function main(ns) {
    // Get all purchased servers
    const purchasedServers = ns.getPurchasedServers();
    
    if (purchasedServers.length === 0) {
        ns.tprint("No purchased servers found.");
        return;
    }

    // Print header
    ns.tprint("\nPurchased Servers Information:");
    ns.tprint("========================================================");
    ns.tprint("Server Name\t\tRAM\t\tUsed RAM\t\tCost");
    ns.tprint("========================================================");
    
    // Sort servers by name
    purchasedServers.sort();
    
    let totalRam = 0;
    let totalUsedRam = 0;
    let totalCost = 0;
    
    // Print information for each server
    for (const server of purchasedServers) {
        const maxRam = ns.getServerMaxRam(server);
        const usedRam = ns.getServerUsedRam(server);
        const cost = ns.getPurchasedServerCost(maxRam);
        
        // Update totals
        totalRam += maxRam;
        totalUsedRam += usedRam;
        totalCost += cost;
        
        // Format the output
        ns.tprint(`${server}\t\t${maxRam}GB\t\t${usedRam.toFixed(2)}GB\t\t$${ns.formatNumber(cost)}`);
    }
    
    // Print summary
    ns.tprint("========================================================");
    ns.tprint(`Total Servers: ${purchasedServers.length}`);
    ns.tprint(`Total RAM: ${totalRam}GB (${(totalUsedRam/totalRam*100).toFixed(2)}% used)`);
    ns.tprint(`Total Cost: $${ns.formatNumber(totalCost)}`);
    ns.tprint(`Average RAM per server: ${(totalRam/purchasedServers.length).toFixed(2)}GB`);
} 